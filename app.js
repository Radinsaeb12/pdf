function novaApp() {
  return {
    activeTab: 'home',
    settingsOpen: false,
    currentToolName: '',
    currentAccept: '*/*',
    toolType: '',
    
    fileList: [],
    compressionQuality: 0.6,
    targetFormat: 'image/webp',
    pdfPassword: '',
    isProcessing: false,
    pdfPages: [],

    settings: {
      appName: 'NovaStudio',
      appSubtitle: 'Akıllı Medya Konsolu',
      logoSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>',
      bgMain: '#0b0f19',
      bgCard: '#131b2e',
      borderCard: '#1e293b',
      accentFrom: '#6366f1',
      accentTo: '#a855f7'
    },

    initApp() {
      const saved = localStorage.getItem('nova_custom_settings');
      if (saved) { try { this.settings = JSON.parse(saved); } catch(e) {} }
    },

    scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); },
    saveSettings() { localStorage.setItem('nova_custom_settings', JSON.stringify(this.settings)); this.settingsOpen = false; },

    openWorkspace(toolName, acceptType, type) {
      this.currentToolName = toolName;
      this.currentAccept = acceptType;
      this.toolType = type;
      this.fileList = [];
      this.pdfPages = [];
      this.pdfPassword = '';
      this.activeTab = 'workspace';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    async handleFiles(event) {
      const files = Array.from(event.target.files);
      if (files.length === 0) return;

      if (this.toolType === 'merger' || this.toolType === 'zip-tool' || this.toolType === 'image-audio-video' || this.toolType === 'video-audio-replace') {
        this.fileList = [...this.fileList, ...files];
      } else {
        this.fileList = [files[0]];
        if (this.toolType === 'pdf-remover') {
          try {
            const arrayBuffer = await files[0].arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const count = pdfDoc.getPageCount();
            this.pdfPages = Array.from({ length: count }, (_, i) => ({
              num: i + 1, index: i, keep: true
            }));
          } catch(e) { console.error(e); }
        }
      }
    },

    removeFile(index) { this.fileList.splice(index, 1); },
    moveFile(index, direction) {
      const target = index + direction;
      if (target < 0 || target >= this.fileList.length) return;
      const tmp = this.fileList[index];
      this.fileList[index] = this.fileList[target];
      this.fileList[target] = tmp;
    },

    async executeTool() {
      if (this.fileList.length === 0) return;
      this.isProcessing = true;

      try {
        if (this.toolType === 'merger') {
          await NovaEngine.mergePDFs(this.fileList);
        } else if (this.toolType === 'pdf-remover') {
          const keepIndexes = this.pdfPages.filter(p => p.keep).map(p => p.index);
          await NovaEngine.editPDFPages(this.fileList[0], keepIndexes);
        } else if (this.toolType === 'pdf-encrypt') {
          await NovaEngine.encryptPDF(this.fileList[0], this.pdfPassword);
        } else if (this.toolType === 'compressor') {
          await NovaEngine.compressImage(this.fileList[0], this.compressionQuality);
        } else if (this.toolType === 'converter') {
          await NovaEngine.convertImage(this.fileList[0], this.targetFormat);
        } else if (this.toolType === 'audio-extract') {
          await NovaEngine.extractAudioFromVideo(this.fileList[0]);
        } else if (this.toolType === 'image-audio-video') {
          if (this.fileList.length < 2) { 
            alert("Lütfen hem bir görsel hem de bir MP3 dosyası ekleyin!"); 
          } else { 
            await NovaEngine.createVideoFromImageAndAudio(this.fileList[0], this.fileList[1]); 
          }
        } else if (this.toolType === 'video-audio-replace') {
          if (this.fileList.length < 2) { 
            alert("Lütfen hem bir MP4 video hem de yeni bir MP3 dosyası ekleyin!"); 
          } else { 
            await NovaEngine.replaceVideoAudio(this.fileList[0], this.fileList[1]); 
          }
        } else if (this.toolType === 'zip-tool') {
          await NovaEngine.createZipArchive(this.fileList);
        }
      } catch (e) { console.error(e); }

      this.isProcessing = false;
    }
  }
}