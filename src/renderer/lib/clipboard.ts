export async function pasteScreenshotFromClipboard(): Promise<File | null> {
  try {
    const imageData = await window.api.clipboard.readImage();
    if (!imageData) return null;

    // imageData is already a Uint8Array from IPC
    const blob = new Blob([imageData.buffer as ArrayBuffer], { type: 'image/png' });

    const timestamp = Date.now();
    const file = new File([blob], `screenshot-${timestamp}.png`, { type: 'image/png' });

    return file;
  } catch (error) {
    console.error('Failed to paste screenshot:', error);
    return null;
  }
}

export async function captureScreenshot(): Promise<File | null> {
  try {
    const imageData = await window.api.screenshot.capture();
    if (!imageData) return null;

    // Convert base64 to Blob
    const base64Data = imageData.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    const timestamp = Date.now();
    const file = new File([blob], `screenshot-${timestamp}.png`, { type: 'image/png' });

    return file;
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    return null;
  }
}
