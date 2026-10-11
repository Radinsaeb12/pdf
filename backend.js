const NovaEngine = {
  async mergePDFs(fileList) {
    if (!fileList || fileList.length < 2) { alert("En az 2 PDF seçmelisiniz."); return; }
    const { PDFDocument } = PDFLib;
    const mergedPdf = await PDFDocument.create();
    for (let file of fileList) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(p => mergedPdf.addPage(p));
    }
    const pdfBytes = await mergedPdf.save();
    this.downloadFile(pdfBytes, "nova-birlestirilmis.pdf", "application/pdf");
  },

  async editPDFPages(file, pagesToKeepIndexes) {
    try {
      const { PDFDocument } = PDFLib;
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();
      if (pagesToKeepIndexes.length === 0) { alert("En az 1 sayfa kalmalı!"); return; }
      const copiedPages = await newPdf.copyPages(pdfDoc, pagesToKeepIndexes);
      copiedPages.forEach(p => newPdf.addPage(p));
      const pdfBytes = await newPdf.save();
      this.downloadFile(pdfBytes, `nova-duzenlenmis-${file.name}`, "application/pdf");
    } catch (e) { alert("PDF düzenlenirken hata oluştu."); }
  },

  async encryptPDF(file, password) {
    if (!password) { alert("Lütfen bir şifre girin!"); return; }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', password);

    try {
      alert("PDF sunucuya gönderiliyor ve şifreleniyor...");
      const response = await fetch('http://localhost:5000/encrypt', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) { throw new Error("Sunucu şifreleme hatası döndürdü."); }
      const blob = await response.blob();
      this.downloadFile(blob, `nova-sifreli-${file.name}`, "application/pdf");
      alert("PDF başarıyla şifrelendi ve indirildi!");
    } catch (e) {
      console.error(e);
      alert("Şifreleme başarısız! Python sunucusunun (app.py) açık olduğundan emin olun.");
    }
  },

  async compressImage(file, quality) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            this.downloadFile(blob, `nova-sikistirilmis-${file.name.split('.')[0]}.jpg`, "image/jpeg");
            resolve(blob);
          }, 'image/jpeg', parseFloat(quality));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  async convertImage(file, targetType) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            const ext = targetType === 'image/webp' ? 'webp' : (targetType === 'image/png' ? 'png' : 'jpg');
            this.downloadFile(blob, `nova-donusturulmus.${ext}`, targetType);
            resolve(blob);
          }, targetType, 0.9);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  async extractAudioFromVideo(videoFile) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await videoFile.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const channels = audioBuffer.numberOfChannels;
      const sampleRate = audioBuffer.sampleRate;
      const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);
      
      const left = audioBuffer.getChannelData(0);
      const right = channels > 1 ? audioBuffer.getChannelData(1) : left;
      
      const sampleBlockSize = 1152;
      const mp3Data = [];

      for (let i = 0; i < left.length; i += sampleBlockSize) {
        const leftChunk = left.subarray(i, i + sampleBlockSize);
        const rightChunk = right.subarray(i, i + sampleBlockSize);
        
        const leftInt = new Int16Array(leftChunk.length);
        const rightInt = new Int16Array(rightChunk.length);
        for (let j = 0; j < leftChunk.length; j++) {
          leftInt[j] = leftChunk[j] < 0 ? leftChunk[j] * 0x8000 : leftChunk[j] * 0x7FFF;
          rightInt[j] = rightChunk[j] < 0 ? rightChunk[j] * 0x8000 : rightChunk[j] * 0x7FFF;
        }

        const mp3buf = channels === 2 
          ? mp3encoder.encodeBuffer(leftInt, rightInt) 
          : mp3encoder.encodeBuffer(leftInt);
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
      }

      const endBuf = mp3encoder.flush();
      if (endBuf.length > 0) mp3Data.push(endBuf);

      const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
      this.downloadFile(mp3Blob, `nova-ses-${videoFile.name.split('.')[0]}.mp3`, "audio/mp3");
      alert("Videodaki ses başarıyla MP3 olarak dışarı aktarıldı!");
    } catch (e) { alert("Ses çıkarılırken hata oluştu."); }
  },

  // GÖRSEL + MP3 BİRLEŞTİREREK VİDEO ÜRETME (WebM Çıkışlı ve Kararlı)
  async createVideoFromImageAndAudio(imageFile, audioFile) {
    try {
      alert("Video oluşturuluyor, lütfen bekleyin...");
      const img = new Image();
      img.src = URL.createObjectURL(imageFile);
      await new Promise(r => img.onload = r);

      const canvas = document.createElement('canvas');
      canvas.width = 1280; canvas.height = 720;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const hRatio = canvas.width / img.width;
      const vRatio = canvas.height / img.height;
      const ratio = Math.min(hRatio, vRatio);
      const centerShiftX = (canvas.width - img.width * ratio) / 2;
      const centerShiftY = (canvas.height - img.height * ratio) / 2;
      ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioFile.arrayBuffer();
      const decodedAudio = await audioCtx.decodeAudioData(audioBuffer);

      const dest = audioCtx.createMediaStreamDestination();
      const sourceNode = audioCtx.createBufferSource();
      sourceNode.buffer = decodedAudio;
      sourceNode.connect(dest);

      const canvasStream = canvas.captureStream(30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      let options = { mimeType: 'video/webm' };
      if (!MediaRecorder.isTypeSupported('video/webm')) {
        options = {};
      }

      const recorder = new MediaRecorder(combinedStream, options);
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        this.downloadFile(blob, "nova-gorsel-muzik-klip.webm", "video/webm");
        alert("Video başarıyla oluşturuldu ve WebM olarak indirildi!");
      };

      recorder.start();
      sourceNode.start(0);

      setTimeout(() => {
        recorder.stop();
        sourceNode.stop();
      }, decodedAudio.duration * 1000);

    } catch (e) {
      console.error(e);
      alert("Video oluşturulurken hata oluştu.");
    }
  },

  // VİDEO SESİNİ YENİ MP3 İLE DEĞİŞTİRME (WebM Çıkışlı ve Kararlı)
  async replaceVideoAudio(videoFile, audioFile) {
    try {
      alert("Video ve ses senkronize ediliyor...");
      const videoEl = document.createElement('video');
      videoEl.src = URL.createObjectURL(videoFile);
      videoEl.muted = true;
      await new Promise(r => videoEl.onloadedmetadata = r);

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioFile.arrayBuffer();
      const decodedAudio = await audioCtx.decodeAudioData(audioBuffer);

      const dest = audioCtx.createMediaStreamDestination();
      const sourceNode = audioCtx.createBufferSource();
      sourceNode.buffer = decodedAudio;
      sourceNode.connect(dest);

      const videoStream = videoEl.captureStream();
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      let options = { mimeType: 'video/webm' };
      if (!MediaRecorder.isTypeSupported('video/webm')) {
        options = {};
      }

      const recorder = new MediaRecorder(combinedStream, options);
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        this.downloadFile(blob, "nova-sesi-degistirilmis-video.webm", "video/webm");
        alert("Videonun sesi başarıyla değiştirildi ve WebM olarak indirildi!");
      };

      recorder.start();
      videoEl.play();
      sourceNode.start(0);

      videoEl.onended = () => {
        recorder.stop();
        sourceNode.stop();
      };

      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          sourceNode.stop();
          videoEl.pause();
        }
      }, videoEl.duration * 1000);

    } catch (e) {
      console.error(e);
      alert("Video sesi değiştirilirken hata oluştu.");
    }
  },

  async createZipArchive(fileList) {
    if (!fileList || fileList.length === 0) return;
    const zip = new JSZip();
    for (let f of fileList) { zip.file(f.name, await f.arrayBuffer()); }
    const content = await zip.generateAsync({ type: "blob" });
    this.downloadFile(content, "nova-arsiv.zip", "application/zip");
  },

  downloadFile(data, filename, mimeType) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};