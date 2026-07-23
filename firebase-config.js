export const firebaseConfig = {
  apiKey: "AIzaSyBwyvdwUedRqB-LKM4uJVSK3dX57XEdpm8",
  authDomain: "plant-guardian-game.firebaseapp.com",
  databaseURL: "https://plant-guardian-game-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "plant-guardian-game",
  storageBucket: "plant-guardian-game.firebasestorage.app",
  messagingSenderId: "166414001452",
  appId: "1:166414001452:web:43dd65644b2ecc06faf889",
  measurementId: "G-QC60K1LQ06"
};

// QR fallback: ใช้งานได้แม้ไลบรารี QR จาก CDN โหลดไม่สำเร็จ
// index.html เรียก QRCode.toCanvas(...) ตามเดิม แต่ฟังก์ชันนี้จะแสดง QR เป็นรูปภาพแทน
const renderQrImage = (canvas, text, options = {}) => {
  const size = Number(options.width) || 230;
  const parent = canvas?.parentElement;
  if (!parent) return;

  canvas.style.display = 'none';
  parent.querySelectorAll('.room-qr-image,.room-qr-error').forEach(el => el.remove());

  const img = document.createElement('img');
  img.className = 'room-qr-image';
  img.alt = 'QR Code สำหรับเข้าร่วมห้อง';
  img.width = size;
  img.height = size;
  img.style.display = 'block';
  img.style.maxWidth = '100%';
  img.style.height = 'auto';
  img.style.borderRadius = '10px';

  const encoded = encodeURIComponent(String(text));
  const sources = [
    `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encoded}`,
    `https://quickchart.io/qr?size=${size}&margin=1&text=${encoded}`
  ];
  let sourceIndex = 0;

  img.onerror = () => {
    sourceIndex += 1;
    if (sourceIndex < sources.length) {
      img.src = sources[sourceIndex];
      return;
    }
    img.remove();
    const error = document.createElement('div');
    error.className = 'room-qr-error status warn';
    error.textContent = 'สร้าง QR Code ไม่สำเร็จ กรุณาใช้ปุ่มคัดลอกลิงก์ห้องแทน';
    parent.appendChild(error);
  };

  img.src = sources[0];
  parent.appendChild(img);
};

globalThis.QRCode = {
  toCanvas(canvas, text, options) {
    renderQrImage(canvas, text, options);
    return Promise.resolve();
  }
};
