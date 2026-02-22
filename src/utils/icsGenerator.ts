import { BookingItem } from '../types';

/**
 * 將 BookingItem 轉換為 iCalendar (RFC 5545) 格式字串
 */
export const generateBookingIcs = (item: BookingItem): string => {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const uid = `booking-${item.id}-${Date.now()}@osaka-kyoto-app`;

    let dtStart = '';
    let dtEnd = '';
    const description = item.note ? item.note.replace(/\n/g, '\\n') : '';
    const location = item.location || '';
    const summary = item.title;

    // 格式化日期為 YYYYMMDD 或 YYYYMMDDTHHmmSSZ
    const formatDate = (dateStr: string, timeStr?: string) => {
        const d = dateStr.replace(/-/g, '');
        if (timeStr) {
            const t = timeStr.replace(/:/g, '') + '00';
            return `${d}T${t}`;
        }
        return d;
    };

    if (item.type === 'flight') {
        dtStart = formatDate(item.date, item.depTime);
        // 如果沒有抵達時間，預設加 3 小時
        if (item.arrTime) {
            dtEnd = formatDate(item.date, item.arrTime);
        } else {
            const start = new Date(`${item.date}T${item.depTime || '09:00'}`);
            const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
            dtEnd = end.toISOString().replace(/[-:]/g, '').split('.')[0];
        }
    } else if (item.type === 'hotel') {
        // 住宿通常是全天事件
        dtStart = formatDate(item.date);
        dtEnd = item.endDate ? formatDate(item.endDate) : formatDate(item.date);
        // iCal 全天事件的結束日期是不包含的，所以如果是一天，DTEND 應該是隔天
        if (dtStart === dtEnd) {
            const d = new Date(item.date);
            d.setDate(d.getDate() + 1);
            dtEnd = d.toISOString().split('T')[0].replace(/-/g, '');
        }
    } else {
        // Spot / Voucher
        dtStart = formatDate(item.date, item.entryTime || '09:00');
        const start = new Date(`${item.date}T${item.entryTime || '09:00'}`);
        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 預設 2 小時
        dtEnd = end.toISOString().replace(/[-:]/g, '').split('.')[0];
    }

    const icsLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Osaka Kyoto Travel App//NONSGML v1.0//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `DTSTAMP:${now}`,
        `UID:${uid}`,
        `DTSTART${item.type === 'hotel' ? ';VALUE=DATE' : ''}:${dtStart}`,
        `DTEND${item.type === 'hotel' ? ';VALUE=DATE' : ''}:${dtEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ];

    return icsLines.join('\r\n');
};

/**
 * 觸發 .ics 檔案下載
 */
export const downloadIcs = (item: BookingItem) => {
    const icsContent = generateBookingIcs(item);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${item.title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
