/**
 * Supabase クライアント設定
 * フロントエンドから直接Supabaseに接続
 */

// ===== Supabase 設定 =====
const SUPABASE_CONFIG = {
  url: 'https://bgochhzpfoxjgmmgzdyp.supabase.co',
  // ⚠️ anon public key を使用（フロントエンド用）
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnb2NoaHpwZm94amdtbWd6ZHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDQ1NzgsImV4cCI6MjA3NjMyMDU3OH0.bgjOtgsnPk_12aXKlCW2dT9QaO9HsIP80HwwkJ4INwc'
};

// Supabase クライアントを作成
const supabase = window.supabase.createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey
);

console.log('✅ Supabase クライアント初期化完了');

// ========================================
// 🆕 フロントエンド用 Supabase 関数
// ========================================

/**
 * 投票リストを取得（Supabase直接クエリ）
 * 🚀 パフォーマンス: GAS経由（3-5秒）→ 直接クエリ（50-100ms）
 *
 * @returns {Promise<Object>} { success, votes, count }
 */
async function getVotesFromSupabase() {
  try {
    console.log('📋 Supabaseから投票リストを取得中...');

    // Supabaseから投票リストを取得（グループ情報も含む）
    const { data: votes, error } = await supabase
      .from('votes')
      .select(`
        *,
        groups (
          group_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Supabaseエラー: ' + error.message);
    }

    console.log('✅ ' + votes.length + '件の投票を取得');

    const now = new Date();

    // 締切をチェックしてステータスを更新
    for (const vote of votes) {
      let daysLeft = null;

      if (vote.deadline && vote.status === 'active') {
        const deadlineDate = new Date(vote.deadline);
        daysLeft = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

        // 締切が過ぎた場合、ステータスを expired に更新
        if (daysLeft < 0) {
          await supabase
            .from('votes')
            .update({ status: 'expired' })
            .eq('id', vote.id);

          vote.status = 'expired';
        }
      }

      // レスポンスデータを整形
      vote.daysLeft = daysLeft;
      vote.targetGroup = vote.groups ? vote.groups.group_name : '';
      delete vote.groups;  // 不要なネストを削除
    }

    return {
      success: true,
      votes: votes,
      count: votes.length
    };

  } catch (error) {
    console.error('❌ 投票リスト取得エラー:', error);
    return {
      success: false,
      error: error.message,
      votes: [],
      count: 0
    };
  }
}

/**
 * 投票詳細を取得（Supabase直接クエリ + Google Form同期）
 * 🚀 パフォーマンス: GAS経由（2-4秒）→ 直接クエリ（100-200ms）
 *
 * @param {string} formUrl - Google Form URL
 * @returns {Promise<Object>} { success, vote, stats, respondedMembers, notRespondedMembers }
 */
async function getVoteDetailFromSupabase(formUrl) {
  try {
    console.log('🔍 Supabaseから投票詳細を取得中:', formUrl);

    // 1. Supabaseから投票情報を取得
    const { data: votes, error: voteError } = await supabase
      .from('votes')
      .select(`
        *,
        groups (
          id,
          group_name
        )
      `)
      .eq('form_url', formUrl)
      .single();

    if (voteError || !votes) {
      throw new Error('投票が見つかりません');
    }

    const vote = votes;
    const voteId = vote.id;
    const targetGroupId = vote.groups.id;

    console.log('✅ 投票を取得:', vote.title);

    // 2. 🔥 最新の回答をGoogle FormからSupabaseに同期（GAS経由）
    console.log('🔄 Google Formの回答を同期中...');
    try {
      // GASの同期関数を呼び出す（軽量な操作）
      await callGAS('syncFormResponsesToSupabase', {
        formId: vote.form_id,
        voteId: voteId
      });
      console.log('✅ 同期完了');
    } catch (syncError) {
      console.warn('⚠️ 同期エラー（続行します）:', syncError);
      // 同期失敗しても続行（既存データで表示）
    }

    // 3. 対象グループのメンバーを取得
    const { data: targetMembers, error: membersError } = await supabase
      .from('group_members')
      .select(`
        student_id,
        members (
          name
        )
      `)
      .eq('group_id', targetGroupId);

    if (membersError) {
      throw new Error('メンバー取得エラー: ' + membersError.message);
    }

    const targetMembersList = targetMembers.map(m => ({
      studentId: m.student_id,
      name: m.members.name
    }));

    console.log('✅ 対象メンバー:', targetMembersList.length + '人');

    // 4. 回答済みメンバーを取得
    const { data: respondedMembers, error: responsesError } = await supabase
      .from('vote_responses')
      .select(`
        student_id,
        responded_at,
        members (
          name
        )
      `)
      .eq('vote_id', voteId);

    if (responsesError) {
      throw new Error('回答取得エラー: ' + responsesError.message);
    }

    const respondedMembersList = respondedMembers.map(r => ({
      studentId: r.student_id,
      name: r.members.name
    }));

    console.log('✅ 回答済み:', respondedMembersList.length + '人');

    // 5. 未回答メンバーを計算
    const respondedSet = new Set(respondedMembersList.map(m => m.studentId));
    const notRespondedMembersList = targetMembersList.filter(
      m => !respondedSet.has(m.studentId)
    );

    console.log('✅ 未回答:', notRespondedMembersList.length + '人');

    // 締切までの日数を計算
    let daysLeft = null;
    if (vote.deadline) {
      const now = new Date();
      const deadlineDate = new Date(vote.deadline);
      daysLeft = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
    }

    return {
      success: true,
      vote: {
        formUrl: vote.form_url,
        formId: vote.form_id,
        responseSheetUrl: vote.response_sheet_url,
        title: vote.title,
        description: vote.description,
        createdAt: vote.created_at,
        deadline: vote.deadline,
        status: vote.status,
        daysLeft: daysLeft
      },
      stats: {
        total: targetMembersList.length,
        respondedCount: respondedMembersList.length,
        notRespondedCount: notRespondedMembersList.length
      },
      respondedMembers: respondedMembersList,
      notRespondedMembers: notRespondedMembersList
    };

  } catch (error) {
    console.error('❌ 投票詳細取得エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * グループ名一覧を取得（Supabase直接クエリ）
 * 🚀 パフォーマンス: GAS経由（500ms-1秒）→ 直接クエリ（20-50ms）
 *
 * @returns {Promise<Object>} { success, groups }
 */
async function getGroupNamesFromSupabase() {
  try {
    console.log('📋 Supabaseからグループ名を取得中...');

    const { data: groups, error } = await supabase
      .from('groups')
      .select('group_name')
      .order('group_name', { ascending: true });

    if (error) {
      throw new Error('Supabaseエラー: ' + error.message);
    }

    const groupNames = groups.map(g => g.group_name);

    console.log('✅ ' + groupNames.length + '個のグループを取得');

    return {
      success: true,
      groups: groupNames
    };

  } catch (error) {
    console.error('❌ グループ名取得エラー:', error);
    return {
      success: false,
      error: error.message,
      groups: []
    };
  }
}

/**
 * Google Formの回答をSupabaseに同期（軽量版 - GAS経由）
 *
 * ⚠️ 注意: この関数は内部的にGASを呼び出しますが、
 * 　　　　呼び出し元は意識する必要がありません
 *
 * @param {string} formId - Form ID
 * @param {string} voteId - Vote ID (Supabase UUID)
 * @returns {Promise<Object>} { success, synced, total }
 */
async function syncFormResponses(formId, voteId) {
  try {
    console.log('🔄 回答を同期中...');

    // GASの同期関数を呼び出す（軽量な操作）
    const result = await callGAS('syncFormResponsesToSupabase', {
      formId: formId,
      voteId: voteId
    });

    return result;

  } catch (error) {
    console.error('❌ 同期エラー:', error);
    return {
      success: false,
      error: error.message,
      synced: 0,
      total: 0
    };
  }
}

console.log('✅ supabase-client.js ロード完了');
