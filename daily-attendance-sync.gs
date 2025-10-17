/**
 * 今日出欠自動同期システム
 *
 * 機能:
 * - 目標表格（読み取り専用）から今日の出欠データを取得
 * - 自分の表格の「シート1」に出欠状況を記録
 * - 状態別にソート（正常出勤 > 早退 > 迟到 > 缺勤）
 * - 人数統計を追加
 *
 * 使用方法:
 * 1. このスクリプトを自分の表格（ID: 1Nbmw1X6CWWwDe_jZhz-MioIi_ZUwG9hzu5Bv9thVzsw）にバインド
 * 2. setupDailyTrigger() を実行して定時トリガーを設定
 * 3. syncTodayAttendance() を手動実行してテスト
 *
 * 定時実行: 毎日日本時間 0:00
 */

// ===== 設定 =====
var SOURCE_SHEET_ID = '1w4CHRRnd966DPxtJw0rjP2WvRrkZ5ZFLdTzdrh-5bBs';  // 目標表格（読み取り専用）
var TARGET_SHEET_NAME = 'シート1';  // 出力先のシート名

/**
 * メイン関数：今日の出欠データを同期
 * Apps Scriptエディタから手動実行可能
 */
function syncTodayAttendance() {
  try {
    Logger.log('===== 今日出欠同期開始 =====');

    // 1. 日本時間で今日の日付を取得
    var jstDate = getJSTDate();
    var month = jstDate.getMonth() + 1;
    var day = jstDate.getDate();
    var dateStr = month + '/' + day;  // 例: "10/24"
    var sheetName = month + '月';      // 例: "10月"

    Logger.log('今日の日付: ' + dateStr);
    Logger.log('対象シート: ' + sheetName);

    // 2. 目標表格からデータを読み取り
    var attendanceData = readSourceData(sheetName, dateStr, month, day);

    if (attendanceData.length === 0) {
      Logger.log('⚠️ 今日のデータが見つかりません');
      writeNoDataMessage();
      return;
    }

    Logger.log('読み取ったデータ件数: ' + attendanceData.length);

    // 3. ステータス別にソート
    var sortedData = sortByStatus(attendanceData);

    // 4. 統計情報を計算
    var stats = calculateStats(sortedData);

    // 5. シート1に書き込み
    writeToTargetSheet(sortedData, stats, dateStr);

    Logger.log('✅ 同期完了');

  } catch (error) {
    Logger.log('❌ エラー: ' + error.toString());
    throw error;
  }
}

/**
 * 日本時間の現在日時を取得
 */
function getJSTDate() {
  var now = new Date();
  var jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  return jstDate;
}

/**
 * 目標表格からデータを読み取り
 */
function readSourceData(sheetName, dateStr, month, day) {
  try {
    // 目標表格を開く
    var sourceSpreadsheet = SpreadsheetApp.openById(SOURCE_SHEET_ID);
    var sourceSheet = sourceSpreadsheet.getSheetByName(sheetName);

    if (!sourceSheet) {
      throw new Error('シート「' + sheetName + '」が見つかりません');
    }

    Logger.log('✅ 目標シート「' + sheetName + '」を開きました');

    // 全データを取得
    var dataRange = sourceSheet.getDataRange();
    var values = dataRange.getValues();
    var backgrounds = dataRange.getBackgrounds();

    // 第3行（インデックス2）で今日の日付の列を探す
    var dateRow = values[2];  // 第3行（0-indexed）
    var dateColIndex = -1;

    for (var col = 0; col < dateRow.length; col++) {
      var cellValue = dateRow[col];

      // 日付オブジェクトの場合の処理
      if (cellValue instanceof Date) {
        var cellMonth = cellValue.getMonth() + 1;
        var cellDay = cellValue.getDate();

        // 月と日が一致するか確認
        if (cellMonth === month && cellDay === day) {
          dateColIndex = col;
          Logger.log('✅ 日付列を発見: ' + cellValue + ' (列インデックス: ' + col + ')');
          break;
        }
      } else {
        // 文字列の場合は従来の方法で処理
        var cellStr = String(cellValue).trim();
        if (cellStr === dateStr || cellStr.indexOf(dateStr) === 0) {
          dateColIndex = col;
          Logger.log('✅ 日付列を発見: ' + cellStr + ' (列インデックス: ' + col + ')');
          break;
        }
      }
    }

    if (dateColIndex === -1) {
      Logger.log('⚠️ 今日の日付「' + dateStr + '」が見つかりません');
      Logger.log('第3行の内容: ' + JSON.stringify(dateRow));
      return [];
    }

    // B列（インデックス1）から名前とステータスを取得
    var attendanceData = [];

    // 第4行から開始（インデックス3）、名前がある行まで読み取り
    for (var row = 3; row < values.length; row++) {
      var gradeCell = values[row][0];  // A列（学年列）
      var name = values[row][1];  // B列（インデックス1）

      // 名前が空の場合はスキップ
      if (!name || String(name).trim() === '') {
        continue;
      }

      // 純粋な数字の場合はスキップ（27、28などを除外）
      var nameStr = String(name).trim();
      if (/^\d+$/.test(nameStr)) {
        Logger.log('  ⚠️ 数字のみの行をスキップ: ' + nameStr);
        continue;
      }

      // A列に「留学中」が含まれている場合は、以降の行を全て無視
      if (gradeCell && String(gradeCell).indexOf('留学中') !== -1) {
        Logger.log('  ⚠️ 留学中の行に到達、以降の読み取りを終了');
        break;  // continueではなくbreakで完全に終了
      }

      // 該当日の背景色と内容を取得
      var bgColor = backgrounds[row][dateColIndex];
      var reason = values[row][dateColIndex];

      // ステータスを判定
      var status = getStatusFromColor(bgColor);

      // データを追加
      attendanceData.push({
        name: String(name).trim(),
        status: status,
        reason: (reason && String(reason).trim() !== '') ? String(reason).trim() : ''
      });

      Logger.log('  ' + name + ': ' + status + (reason ? ' (' + reason + ')' : ''));
    }

    return attendanceData;

  } catch (error) {
    Logger.log('❌ データ読み取りエラー: ' + error.toString());
    throw error;
  }
}

/**
 * 背景色からステータスを判定
 */
function getStatusFromColor(bgColor) {
  // 背景色がnullまたは白色（#ffffff）の場合は正常出勤
  if (!bgColor || bgColor === '#ffffff' || bgColor === '#fff') {
    return '正常出勤';
  }

  // RGB値を抽出（16進数カラーコードから）
  var colorLower = bgColor.toLowerCase();

  // 色の判定（RGB値を比較）
  // Google Sheetsの背景色は #rrggbb 形式
  var r = 0, g = 0, b = 0;

  if (colorLower.length === 7) {
    r = parseInt(colorLower.substr(1, 2), 16);
    g = parseInt(colorLower.substr(3, 2), 16);
    b = parseInt(colorLower.substr(5, 2), 16);
  }

  Logger.log('    背景色: ' + bgColor + ' (R=' + r + ', G=' + g + ', B=' + b + ')');

  // 青色（早退）：青が最も強い
  if (b > r && b > g && b > 100) {
    return '早退';
  }

  // 緑色（遅刻）：緑が最も強い
  if (g > r && g > b && g > 100) {
    return '遅刻';
  }

  // 赤色（欠席）：赤が最も強い
  if (r > g && r > b && r > 100) {
    return '欠席';
  }

  // その他（白っぽい、グレーなど）は正常出勤とみなす
  return '正常出勤';
}

/**
 * ステータス別にソート（正常出勤 > 早退 > 遅刻 > 欠席）
 */
function sortByStatus(data) {
  var statusOrder = {
    '正常出勤': 1,
    '早退': 2,
    '遅刻': 3,
    '欠席': 4
  };

  data.sort(function(a, b) {
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return data;
}

/**
 * 統計情報を計算
 */
function calculateStats(data) {
  var stats = {
    '正常出勤': 0,
    '早退': 0,
    '遅刻': 0,
    '欠席': 0
  };

  data.forEach(function(item) {
    if (stats[item.status] !== undefined) {
      stats[item.status]++;
    }
  });

  return stats;
}

/**
 * シート1に書き込み
 */
function writeToTargetSheet(data, stats, dateStr) {
  try {
    // 自分の表格を取得（バインドされているスプレッドシート）
    var targetSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var targetSheet = targetSpreadsheet.getSheetByName(TARGET_SHEET_NAME);

    if (!targetSheet) {
      throw new Error('シート「' + TARGET_SHEET_NAME + '」が見つかりません');
    }

    // シートをクリア（データのみ、シート自体は削除しない）
    targetSheet.clear();

    Logger.log('✅ シートをクリアしました');

    // ヘッダー行を作成（各行は3列に統一）
    var headers = [
      ['更新日時: ' + getJSTDate().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }), '', ''],
      ['対象日: ' + dateStr, '', ''],
      ['', '', ''],
      ['姓名', 'ステータス', '理由']
    ];

    targetSheet.getRange(1, 1, headers.length, 3).setValues(headers);

    // ヘッダー行のスタイル設定
    var headerRange = targetSheet.getRange(4, 1, 1, 3);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#b8282d');  // 上智大学の赤色
    headerRange.setFontColor('#ffffff');
    headerRange.setHorizontalAlignment('center');

    // ヘッダー行を固定
    targetSheet.setFrozenRows(4);

    // データ行を作成
    var dataRows = [];
    data.forEach(function(item) {
      dataRows.push([
        item.name,
        item.status,
        item.reason
      ]);
    });

    // データを書き込み
    if (dataRows.length > 0) {
      targetSheet.getRange(5, 1, dataRows.length, 3).setValues(dataRows);
      Logger.log('✅ データを書き込みました: ' + dataRows.length + '件');

      // ステータス列に色を付ける
      for (var i = 0; i < dataRows.length; i++) {
        var row = 5 + i;
        var status = dataRows[i][1];
        var statusCell = targetSheet.getRange(row, 2);

        switch (status) {
          case '正常出勤':
            statusCell.setBackground('#e8f5e9');  // 薄い緑
            statusCell.setFontColor('#2d7a3e');
            break;
          case '早退':
            statusCell.setBackground('#e3f2fd');  // 薄い青
            statusCell.setFontColor('#1565c0');
            break;
          case '遅刻':
            statusCell.setBackground('#fff9c4');  // 薄い黄
            statusCell.setFontColor('#f57f17');
            break;
          case '欠席':
            statusCell.setBackground('#ffebee');  // 薄い赤
            statusCell.setFontColor('#c62828');
            break;
        }
      }
    }

    // 統計情報を追加
    var statsStartRow = 5 + dataRows.length + 2;  // データの後、2行空ける

    var statsRows = [
      ['統計情報', ''],
      ['正常出勤', stats['正常出勤'] + '人'],
      ['早退', stats['早退'] + '人'],
      ['遅刻', stats['遅刻'] + '人'],
      ['欠席', stats['欠席'] + '人'],
      ['', ''],
      ['合計', (stats['正常出勤'] + stats['早退'] + stats['遅刻'] + stats['欠席']) + '人']
    ];

    targetSheet.getRange(statsStartRow, 1, statsRows.length, 2).setValues(statsRows);

    // 統計情報のスタイル設定
    var statsHeaderRange = targetSheet.getRange(statsStartRow, 1, 1, 2);
    statsHeaderRange.setFontWeight('bold');
    statsHeaderRange.setFontSize(11);

    var statsTotalRange = targetSheet.getRange(statsStartRow + statsRows.length - 1, 1, 1, 2);
    statsTotalRange.setFontWeight('bold');
    statsTotalRange.setBackground('#f5f5f5');

    // 列幅を調整
    targetSheet.setColumnWidth(1, 120);  // 姓名
    targetSheet.setColumnWidth(2, 100);  // ステータス
    targetSheet.setColumnWidth(3, 200);  // 理由

    Logger.log('✅ シートへの書き込み完了');

  } catch (error) {
    Logger.log('❌ シート書き込みエラー: ' + error.toString());
    throw error;
  }
}

/**
 * データがない場合のメッセージを書き込み
 */
function writeNoDataMessage() {
  try {
    var targetSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var targetSheet = targetSpreadsheet.getSheetByName(TARGET_SHEET_NAME);

    if (!targetSheet) {
      throw new Error('シート「' + TARGET_SHEET_NAME + '」が見つかりません');
    }

    targetSheet.clear();

    var message = [
      ['今日のデータが見つかりません'],
      [''],
      ['更新日時: ' + getJSTDate().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })]
    ];

    targetSheet.getRange(1, 1, message.length, 1).setValues(message);

  } catch (error) {
    Logger.log('❌ メッセージ書き込みエラー: ' + error.toString());
  }
}

/**
 * 定時トリガーを設定（毎日日本時間0:00に実行）
 * Apps Scriptエディタから手動実行してトリガーを初期化
 */
function setupDailyTrigger() {
  try {
    Logger.log('===== 定時トリガー設定開始 =====');

    // 既存のトリガーを削除（重複防止）
    var triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(trigger) {
      if (trigger.getHandlerFunction() === 'syncTodayAttendance') {
        ScriptApp.deleteTrigger(trigger);
        Logger.log('既存のトリガーを削除しました');
      }
    });

    // 新しいトリガーを作成（毎日0:00）
    ScriptApp.newTrigger('syncTodayAttendance')
      .timeBased()
      .everyDays(1)
      .atHour(0)  // 0時
      .nearMinute(0)  // 0分
      .inTimezone('Asia/Tokyo')  // 日本時間
      .create();

    Logger.log('✅ 定時トリガーを設定しました（毎日0:00）');

    // 確認メッセージ
    Browser.msgBox(
      '設定完了',
      '定時トリガーを設定しました！\\n\\n' +
      '実行時間: 毎日 0:00 (日本時間)\\n' +
      '実行関数: syncTodayAttendance()\\n\\n' +
      'トリガーは「トリガー」メニューから確認できます。',
      Browser.Buttons.OK
    );

  } catch (error) {
    Logger.log('❌ トリガー設定エラー: ' + error.toString());
    Browser.msgBox(
      'エラー',
      'トリガーの設定に失敗しました:\\n' + error.toString(),
      Browser.Buttons.OK
    );
  }
}

/**
 * トリガーを削除（必要に応じて実行）
 */
function removeDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var removedCount = 0;

  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'syncTodayAttendance') {
      ScriptApp.deleteTrigger(trigger);
      removedCount++;
    }
  });

  Logger.log('削除したトリガー数: ' + removedCount);
  Browser.msgBox(
    '削除完了',
    removedCount + '個のトリガーを削除しました',
    Browser.Buttons.OK
  );
}

/**
 * テスト関数：今日のデータを表示
 */
function testTodayData() {
  var jstDate = getJSTDate();
  var month = jstDate.getMonth() + 1;
  var day = jstDate.getDate();
  var dateStr = month + '/' + day;
  var sheetName = month + '月';

  Logger.log('今日の日付: ' + dateStr);
  Logger.log('対象シート: ' + sheetName);

  var data = readSourceData(sheetName, dateStr, month, day);

  Logger.log('取得データ:');
  data.forEach(function(item) {
    Logger.log('  ' + item.name + ': ' + item.status + ' (' + item.reason + ')');
  });
}
