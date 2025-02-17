/***********************************************
 * 計算・ユーティリティ関数
 ***********************************************/

// 出勤・退勤の差
function calculateTimeDifference(startTime, endTime) {
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  const diff = (end - start) / (1000 * 60 * 60);
  return parseFloat(diff.toFixed(2));
}

// 早朝勤務時間
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

// 夕方勤務時間
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

// "YYYY-MM-DD" から "MM-DD" 部分を返す
function formatDate(dateString) {
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[1]}-${parts[2]}`;
  }
  return dateString;
}

/***********************************************
 * イベントリスナー
 ***********************************************/

document.getElementById('isPaidLeave').addEventListener('change', function() {
  if (this.checked) {
    const pwd = prompt("有給として登録するためのパスワードを入力してください:");
    if (pwd !== "4564") {
      alert("パスワードが違います。");
      this.checked = false;
      return;
    }
    // 有給用の欄を表示
    document.getElementById('normalDateGroup').classList.add('hidden');
    document.getElementById('paidLeaveYearGroup').classList.remove('hidden');
    document.getElementById('multiDateGroup').classList.remove('hidden');
    // 必須切替
    document.getElementById('dateSingle').required = false;
    document.getElementById('paidLeaveYear').required = true;
    document.getElementById('dateMulti').required = true;
  } else {
    // 通常勤務
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
document.getElementById('restoreBtn').addEventListener('click', function() {
  document.getElementById('restoreFile').click();
});
document.getElementById('restoreFile').addEventListener('change', function(e) {
  restoreData(e.target.files[0]);
});

// 検索機能
document.getElementById('searchName').addEventListener('input', displayTimeCards);

// ページ読み込み
document.addEventListener('DOMContentLoaded', displayTimeCards);

/***********************************************
 * 保存・表示・削除
 ***********************************************/
function saveTimeCard() {
  const name = document.getElementById('name').value.trim();
  const isPaidLeave = document.getElementById('isPaidLeave').checked;

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

  let finalDates = [];
  if (isPaidLeave) {
    // 有給
    const paidLeaveYear = document.getElementById('paidLeaveYear').value.trim();
    let dateMulti = document.getElementById('dateMulti').value.trim();
    if (!paidLeaveYear) {
      alert('有給用の西暦を入力してください。');
      return;
    }
    if (!dateMulti) {
      alert('月日を入力してください。');
      return;
    }
    // 4桁なら "0212" → "02-12"
    const splitted = dateMulti.split(',')
      .map(s => s.trim())
      .filter(s => s !== '')
      .map(s => (s.length===4 && s.indexOf('-')===-1) ? s.slice(0,2)+'-'+s.slice(2) : s);
    if (splitted.length === 0) {
      alert('月日を入力してください。');
      return;
    }
    finalDates = splitted.map(md => `${paidLeaveYear}-${md}`);
  } else {
    // 通常勤務
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

  // フォームのリセット & 送信完了メッセージ
  if (isPaidLeave) {
    // 有給：名前 & 有給用西暦は残し、他をクリア
    document.getElementById('checkIn').value = "";
    document.getElementById('checkOut').value = "";
    document.getElementById('dateMulti').value = "";
    // 分かりやすいようにアラートやメッセージ表示
    alert('送信が完了しました（有給）。');
  } else {
    // 通常：すべてリセット（名前含む）
    document.getElementById('timeCardForm').reset();
    document.getElementById('isPaidLeave').checked = false;
    document.getElementById('normalDateGroup').classList.remove('hidden');
    document.getElementById('paidLeaveYearGroup').classList.add('hidden');
    document.getElementById('multiDateGroup').classList.add('hidden');
    document.getElementById('dateSingle').required = true;
    document.getElementById('paidLeaveYear').required = false;
    document.getElementById('dateMulti').required = false;
    alert('送信が完了しました（通常）。');
  }

  displayTimeCards();
}

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

/****************************************************
 * 全データ削除（パスワード）
 ****************************************************/
function requestPasswordAndClearData() {
  const password = prompt('パスワードを入力してください:');
  if (password === '4564' && confirm('本当にすべてのデータをクリアしますか？')) {
    localStorage.removeItem('timeCards');
    displayTimeCards();
  } else {
    alert('パスワードが違います。');
  }
}

/****************************************************
 * Excelエクスポート
 ****************************************************/
function exportToExcel() {
  const allTimeCards = JSON.parse(localStorage.getItem('timeCards')) || {};
  const workbook = XLSX.utils.book_new();

  for (let name in allTimeCards) {
    const sheetData = [];
    sheetData.push([`名前: ${name}`]);
    sheetData.push(["日付","出勤時間","退勤時間","合計時間","朝夕勤務","通常合計","勤務種別"]);

    let overallTotalDay = 0,
        overallTotalMorningEvening = 0,
        overallTotalNormal = 0;

    const sortedDates = Object.keys(allTimeCards[name]).sort();
    sortedDates.forEach(date => {
      allTimeCards[name][date].forEach(card => {
        if (!card.checkIn || !card.checkOut) return;
        const totalHours = parseFloat(calculateTimeDifference(card.checkIn, card.checkOut));
        const early = parseFloat(calculateEarlyMorningTime(card.checkIn, card.checkOut));
        const eve = parseFloat(calculateEveningTime(card.checkIn, card.checkOut));
        const morningEvening = early + eve;
        const normalHours = totalHours - morningEvening;

        overallTotalDay += totalHours;
        overallTotalMorningEvening += morningEvening;
        overallTotalNormal += normalHours;

        sheetData.push([
          formatDate(date),
          card.checkIn,
          card.checkOut,
          totalHours.toFixed(2),
          morningEvening.toFixed(2),
          normalHours.toFixed(2),
          card.isPaidLeave ? "有給" : ""
        ]);
      });
    });

    sheetData.push([]);
    sheetData.push([
      "合計","","",overallTotalDay.toFixed(2),
      overallTotalMorningEvening.toFixed(2),
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

/****************************************************
 * バックアップ・リストア
 ****************************************************/
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
  return {
    start: new Date(startYear, startMonth, 11),
    end: new Date(endYear, endMonth, 10)
  };
}

function backupLatestMonthData() {
  const allTimeCards = JSON.parse(localStorage.getItem('timeCards')) || {};
  const latestMonthPeriod = getLatestMonthPeriod();
  const latestMonthData = {};
  for (let name in allTimeCards) {
    for (let date in allTimeCards[name]) {
      const d = new Date(date);
      if (d >= latestMonthPeriod.start && d <= latestMonthPeriod.end) {
        if (!latestMonthData[name]) {
          latestMonthData[name] = {};
        }
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




