
// ===== 計算用関数 =====

// 出勤・退勤の差を時間単位で計算（小数点2桁）
function calculateTimeDifference(startTime, endTime) {
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  const diff = (end - start) / (1000 * 60 * 60);
  return parseFloat(diff.toFixed(2));
}

// 早朝勤務時間を計算（08:30まで）
function calculateEarlyMorningTime(startTime, endTime) {
  const endLimit = new Date('1970-01-01T08:30');
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  if (end <= endLimit) {
    return calculateTimeDifference(startTime, endTime);
  } else if (start < endLimit) {
    return calculateTimeDifference(startTime, '08:30');
  }
  return 0;
}

// 夕方勤務時間を計算（16:00以降）
function calculateEveningTime(startTime, endTime) {
  const startLimit = new Date('1970-01-01T16:00');
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  if (start >= startLimit) {
    return calculateTimeDifference(startTime, endTime);
  } else if (end > startLimit) {
    return calculateTimeDifference('16:00', endTime);
  }
  return 0;
}

// ===== イベントリスナー =====

// 有給として登録するチェックボックスにチェックしたとき、パスワード入力を要求（正解:4564）
document.getElementById('isPaidLeave').addEventListener('change', function() {
  if (this.checked) {
    const pwd = prompt("有給として登録するためのパスワードを入力してください:");
    if (pwd !== "4564") {
      alert("パスワードが違います。");
      this.checked = false;
      return;
    }
    // パスワード正解の場合、有給用の入力欄を表示
    document.getElementById('normalDateGroup').classList.add('hidden');
    document.getElementById('paidLeaveYearGroup').classList.remove('hidden');
    document.getElementById('multiDateGroup').classList.remove('hidden');
    document.getElementById('dateSingle').required = false;
    document.getElementById('paidLeaveYear').required = true;
    document.getElementById('dateMulti').required = true;
  } else {
    // チェックが外れた場合、通常勤務用の入力欄を表示
    document.getElementById('normalDateGroup').classList.remove('hidden');
    document.getElementById('paidLeaveYearGroup').classList.add('hidden');
    document.getElementById('multiDateGroup').classList.add('hidden');
    document.getElementById('dateSingle').required = true;
    document.getElementById('paidLeaveYear').required = false;
    document.getElementById('dateMulti').required = false;
  }
});

document.getElementById('timeCardForm').addEventListener('submit', function(e) {
  e.preventDefault();
  saveTimeCard();
});

document.getElementById('exportBtn').addEventListener('click', exportToExcel);
document.getElementById('clearDataBtn').addEventListener('click', requestPasswordAndClearData);
document.getElementById('backupBtn').addEventListener('click', backupData);
document.getElementById('backupLatestMonthBtn').addEventListener('click', backupLatestMonthData);
document.getElementById('restoreBtn').addEventListener('click', () => {
  document.getElementById('restoreFile').click();
});
document.getElementById('restoreFile').addEventListener('change', e => {
  restoreData(e.target.files[0]);
});
document.getElementById('searchName').addEventListener('input', displayTimeCards);

// ===== 保存・表示・削除関数 =====

function saveTimeCard() {
  const nameField = document.getElementById('name');
  const name = nameField.value.trim();
  const isPaidLeave = document.getElementById('isPaidLeave').checked;
  let finalDates = [];

  if (!name) {
    alert('名前を入力してください。');
    return;
  }

  const checkIn = document.getElementById('checkIn').value;
  const checkOut = document.getElementById('checkOut').value;
  if (!checkIn || !checkOut) {
    alert('出勤時間および退勤時間を入力してください。');
    return;
  }

  if (isPaidLeave) {
    const paidLeaveYear = document.getElementById('paidLeaveYear').value.trim();
    const dateMulti = document.getElementById('dateMulti').value.trim();
    if (!paidLeaveYear) {
      alert('有給用の西暦を入力してください。');
      return;
    }
    if (!dateMulti) {
      alert('月日を入力してください。');
      return;
    }
    const splitted = dateMulti.split(',')
      .map(s => s.trim())
      .filter(s => s !== '');
    if (splitted.length === 0) {
      alert('月日を入力してください。');
      return;
    }
    finalDates = splitted.map(md => `${paidLeaveYear}-${md}`);
  } else {
    const dateSingle = document.getElementById('dateSingle').value;
    if (!dateSingle) {
      alert('月日を入力してください。');
      return;
    }
    finalDates = [dateSingle];
  }

  const timeCardData = {
    checkIn: checkIn,
    checkOut: checkOut,
    isPaidLeave: isPaidLeave
  };

  let allTimeCards = JSON.parse(localStorage.getItem('timeCards')) || {};
  if (!allTimeCards[name]) {
    allTimeCards[name] = {};
  }
  finalDates.forEach(dateStr => {
    if (!allTimeCards[name][dateStr]) {
      allTimeCards[name][dateStr] = [];
    }
    allTimeCards[name][dateStr].push(timeCardData);
  });
  localStorage.setItem('timeCards', JSON.stringify(allTimeCards));

  // 入力欄のリセット
  if (isPaidLeave) {
    // 有給の場合：名前と有給用西暦は残す。出勤時間、退勤時間、複数日付のみクリア
    document.getElementById('checkIn').value = "";
    document.getElementById('checkOut').value = "";
    document.getElementById('dateMulti').value = "";
  } else {
    // 通常勤務の場合は全入力欄をクリア
    document.getElementById('timeCardForm').reset();
  }
  // 有給チェックはそのまま維持（有給の場合）
  if (!isPaidLeave) {
    document.getElementById('isPaidLeave').checked = false;
    document.getElementById('normalDateGroup').classList.remove('hidden');
    document.getElementById('paidLeaveYearGroup').classList.add('hidden');
    document.getElementById('multiDateGroup').classList.add('hidden');
    document.getElementById('dateSingle').required = true;
    document.getElementById('paidLeaveYear').required = false;
    document.getElementById('dateMulti').required = false;
  }
  displayTimeCards();
}

// "YYYY-MM-DD" 形式の日付から "MM-DD" 部分だけを返す
function formatDate(dateString) {
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[1]}-${parts[2]}`;
  }
  return dateString;
}

// ローカルストレージのデータを画面に表示
function displayTimeCards() {
  const searchName = document.getElementById('searchName').value.trim().toLowerCase();
  const allTimeCards = JSON.parse(localStorage.getItem('timeCards')) || {};
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '<h2>勤怠一覧</h2>';
  for (let name in allTimeCards) {
    if (searchName && !name.toLowerCase().includes(searchName)) continue;
    resultDiv.innerHTML += `<h3>${name}</h3>`;
    const sortedDates = Object.keys(allTimeCards[name]).sort();
    sortedDates.forEach(date => {
      resultDiv.innerHTML += `<h4>${formatDate(date)}</h4>`;
      if (Array.isArray(allTimeCards[name][date])) {
        allTimeCards[name][date].forEach((card, index) => {
          if (card && card.checkIn && card.checkOut) {
            const paidLabel = card.isPaidLeave ? '<span style="color: blue;">【有給】</span>' : '';
            resultDiv.innerHTML += `
              <div>
                <p><strong>出勤時間:</strong> ${card.checkIn}</p>
                <p><strong>退勤時間:</strong> ${card.checkOut}</p>
                <p>${paidLabel}</p>
                <button class="delete-button" onclick="deleteTimeCard('${name}', '${date}', ${index})">削除</button>
                <hr>
              </div>
            `;
          }
        });
      }
    });
  }
}

function deleteTimeCard(name, date, index) {
  if (!confirm('本当に削除しますか？')) return;
  let allTimeCards = JSON.parse(localStorage.getItem('timeCards')) || {};
  allTimeCards[name][date].splice(index, 1);
  if (allTimeCards[name][date].length === 0) {
    delete allTimeCards[name][date];
  }
  if (Object.keys(allTimeCards[name]).length === 0) {
    delete allTimeCards[name];
  }
  localStorage.setItem('timeCards', JSON.stringify(allTimeCards));
  displayTimeCards();
}

function requestPasswordAndClearData() {
  const password = prompt('パスワードを入力してください:');
  if (password === '4564' && confirm('本当にすべてのデータをクリアしますか？')) {
    localStorage.removeItem('timeCards');
    displayTimeCards();
  } else {
    alert('パスワードが違います。');
  }
}

// ===== Excelエクスポート =====
// 各名前ごとにシートを作成し、日付順に全レコードを出力。
// 最終行は全勤務合計（合計時間、早朝勤務、夕方勤務、通常合計）を「合計」として出力
// ※勤務種別は、有給の場合のみ「有給」と表示し、通常の場合は空欄にする
function exportToExcel() {
  const allTimeCards = JSON.parse(localStorage.getItem('timeCards')) || {};
  const workbook = XLSX.utils.book_new();

  for (let name in allTimeCards) {
    const sheetData = [];
    sheetData.push([`名前: ${name}`]);
    // ヘッダー行：4列目を「合計時間」と表記
    sheetData.push(["日付", "出勤時間", "退勤時間", "合計時間", "早朝勤務", "夕方勤務", "通常合計", "勤務種別"]);

    let overallTotalDay = 0,
        overallTotalEarly = 0,
        overallTotalEvening = 0,
        overallTotalNormal = 0;

    const sortedDates = Object.keys(allTimeCards[name]).sort();
    sortedDates.forEach(date => {
      allTimeCards[name][date].forEach(card => {
        const totalHours = parseFloat(calculateTimeDifference(card.checkIn, card.checkOut));
        const earlyMorning = parseFloat(calculateEarlyMorningTime(card.checkIn, card.checkOut));
        const evening = parseFloat(calculateEveningTime(card.checkIn, card.checkOut));
        const normalHours = totalHours - earlyMorning - evening;

        overallTotalDay += totalHours;
        overallTotalEarly += earlyMorning;
        overallTotalEvening += evening;
        overallTotalNormal += normalHours;

        sheetData.push([
          formatDate(date),
          card.checkIn,
          card.checkOut,
          totalHours.toFixed(2),
          earlyMorning.toFixed(2),
          evening.toFixed(2),
          normalHours.toFixed(2),
          card.isPaidLeave ? "有給" : ""
        ]);
      });
    });

    // 最終行：全勤務合計を「合計」として出力
    sheetData.push([]);
    sheetData.push([
      "合計",
      "",
      "",
      overallTotalDay.toFixed(2),
      overallTotalEarly.toFixed(2),
      overallTotalEvening.toFixed(2),
      overallTotalNormal.toFixed(2),
      ""
    ]);

    let sheetName = name;
    if (sortedDates.length > 0) {
      const d = new Date(sortedDates[0]);
      const monthNames = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
      sheetName += monthNames[d.getMonth()];
    }
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }
  XLSX.writeFile(workbook, "timecards.xlsx");
}

// ===== バックアップ・リストア =====

function backupData() {
  const allTimeCards = JSON.parse(localStorage.getItem('timeCards')) || {};
  const dataStr = JSON.stringify(allTimeCards);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'timecards_backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

function getLatestMonthPeriod() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const startYear = (today.getDate() >= 11) ? currentYear : (currentMonth === 0 ? currentYear - 1 : currentYear);
  const startMonth = (today.getDate() >= 11) ? currentMonth : (currentMonth === 0 ? 11 : currentMonth - 1);
  const endYear = (startMonth === 11) ? startYear + 1 : startYear;
  const endMonth = (startMonth + 1) % 12;
  const start = new Date(startYear, startMonth, 11);
  const end = new Date(endYear, endMonth, 10);
  return { start, end };
}

function backupLatestMonthData() {
  const allTimeCards = JSON.parse(localStorage.getItem('timeCards')) || {};
  const latestMonthPeriod = getLatestMonthPeriod();
  const latestMonthData = {};
  for (let name in allTimeCards) {
    for (let date in allTimeCards[name]) {
      const recordDate = new Date(date);
      if (recordDate >= latestMonthPeriod.start && recordDate <= latestMonthPeriod.end) {
        if (!latestMonthData[name]) latestMonthData[name] = {};
        latestMonthData[name][date] = allTimeCards[name][date];
      }
    }
  }
  if (Object.keys(latestMonthData).length === 0) {
    alert('最新の月のデータがありません。');
    return;
  }
  const dataStr = JSON.stringify(latestMonthData);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'latest_month_timecards_backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

function restoreData(file) {
  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const allTimeCards = JSON.parse(event.target.result);
      if (allTimeCards && typeof allTimeCards === 'object') {
        localStorage.setItem('timeCards', JSON.stringify(allTimeCards));
        displayTimeCards();
      } else {
        alert('無効なデータ形式です。');
      }
    } catch (e) {
      alert('データの読み込み中にエラーが発生しました。');
    }
  };
  reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', displayTimeCards);




