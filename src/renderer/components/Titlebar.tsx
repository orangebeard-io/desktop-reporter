import logoImg from '../../../assets/logo.png';

export function Titlebar() {
  const handleMinimize = () => window.api.window.minimize();
  const handleMaximize = () => window.api.window.maximize();
  const handleClose = () => window.api.window.close();

  return (
    <div className="h-8 bg-orangebeard-orange dark:bg-orangebeard-dark-green flex items-center justify-between px-3 -webkit-app-region-drag select-none">
      <div className="flex items-center gap-2">
        <img src={logoImg} alt="Orangebeard" className="w-5" />
        <span className="text-white font-semibold text-sm">Orangebeard Desktop Reporter</span>
      </div>
      <div className="flex gap-1 -webkit-app-region-no-drag">
        <button
          onClick={handleMinimize}
          className="w-6 h-6 flex items-center justify-center hover:bg-white/20 text-white rounded transition"
          title="Minimize"
        >
          −
        </button>
        <button
          onClick={handleMaximize}
          className="w-6 h-6 flex items-center justify-center hover:bg-white/20 text-white rounded transition"
          title="Maximize"
        >
          □
        </button>
        <button
          onClick={handleClose}
          className="w-6 h-6 flex items-center justify-center hover:bg-red-600 text-white rounded transition"
          title="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}
