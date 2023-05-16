const { Menu, shell, components, BrowserWindow, app, dialog } = require('electron');
const prompt = require('electron-prompt');
const path = require('path');
const fs = require('fs');
const electronLog = require('electron-log');

module.exports = (store, services, mainWindow, app, defaultUserAgent) => {
  var servicesMenuItems = [];
  var defaultServiceMenuItems = [];
  var enabledServicesMenuItems = [];
  // Get app version from package.json
  var appVersion = app.getVersion();
  // Enable remote module on sub-windows
  require("@electron/remote/main").enable(mainWindow.webContents);

  if (services !== undefined) {
    // Menu with all services that can be clicked for easy switching
    servicesMenuItems = services.map(service => ({
      label: service.name,
      visible: !service.hidden,
      click() {
        electronLog.info('Loading URL: ' + service.url);
        mainWindow.loadURL(service.url);
        mainWindow.send('run-loader', service);
      }
    }));

    // Menu for selecting default service (one which is opened on starting the app)
    defaultServiceMenuItems = services.map(service => ({
      label: service.name,
      type: 'checkbox',
      checked: store.get('options.defaultService')
          ? store.get('options.defaultService') == service.name
          : false,
      click(e) {
        e.menu.items.forEach(e => {
          if (!(e.label === service.name)) e.checked = false;
        });
        store.set('options.defaultService', service.name);
      }
    }));

    // Menu with all services that can be clicked for easy switching
    enabledServicesMenuItems = services.map(service => ({
      label: service.name,
      type: 'checkbox',
      checked: !service.hidden,
      click() {
        if(service._defaultService) {
          let currServices = store.get('services');
          currServices.push({
            name: service.name,
            hidden: !service.hidden
          });
          services = currServices;
          store.set('services', currServices);
        } else {
          let currServices = store.get('services');
          let currService = currServices.find(s => service.name == s.name);
          currService.hidden = service.hidden ? undefined : true
          services = currServices;
          store.set('services', currServices);
        }
      }
    }));
  }

  return Menu.buildFromTemplate([
    {
      label: 'Quark Player',
      submenu: [
        {
          label: 'Go Back',
          accelerator: 'Alt+Left',
          click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.webContents.goBack();
            electronLog.info('Navigated back');
          }
        },
        {
          label: 'Go Forward',
          accelerator: 'Alt+Right',
          click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.webContents.goForward();
            electronLog.info('Navigated forward');
          }
        },
        {
          label: 'New Window',
          accelerator: 'CmdorCtrl+N',
          click(item) {
            app.emit('new-window');
          }
        },
        {
          label: 'Close Window',
          accelerator: 'CmdorCtrl+W',
          click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.close();
            electronLog.info('Closed a window');
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Open Custom URL',
          accelerator: 'CmdOrCtrl+O',
          click() {
            prompt({
              title: 'Open Custom URL (add https:// before URL)',
              label: 'URL:',
              inputAttrs: {
                  type: 'url',
                  placeholder: 'https://example.org'
              },
              alwaysOnTop: true
          })
          .then(inputtedURL => {
            if (inputtedURL != null) {
              if(inputtedURL == '') {
                inputtedURL = 'https://example.org';
              }

              electronLog.info('Opening Custom URL: ' + inputtedURL);
              mainWindow.loadURL(inputtedURL);
            }
          })
          .catch(console.error);
          }
        },
        { label: 'Open File',
          accelerator: 'Ctrl+Shift+O',
          click() {
            dialog.showOpenDialogSync(mainWindow, { properties: ['openFile'] }).then(result => {
				mainWindow.loadFile(result)});
            //mainWindow.loadFile
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit Quark Player',
          accelerator: 'CmdOrCtrl+Q', // TODO: Non Mac Shortcut
          click() {
            app.quit();
          }
        },
      ]
    },
    {
      label: 'Services',
      submenu: [
        {
          label: 'Main Menu',
          accelerator: 'CmdOrCtrl+M',
          click() {
            electronLog.info('Opening main menu...');
            mainWindow.webContents.userAgent = defaultUserAgent;
            mainWindow.loadFile('./ui/index.html');
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Open Custom URL',
          accelerator: 'CmdOrCtrl+O',
          click() {
            prompt({
              title: 'Open Custom URL (add https:// before URL)',
              label: 'URL:',
              inputAttrs: {
                  type: 'url',
                  placeholder: 'https://example.org'
              },
              alwaysOnTop: true
          })
          .then(inputtedURL => {
            if (inputtedURL != null) {
              if(inputtedURL == '') {
                inputtedURL = 'https://example.org';
              }

              electronLog.info('Opening Custom URL: ' + inputtedURL);
              mainWindow.loadURL(inputtedURL);
            }
          })
          .catch(console.error);
          }
        }
      ].concat(servicesMenuItems)
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Always On Top',
          type: 'checkbox',
          click(e) {
            store.set('options.alwaysOnTop', e.checked);
            mainWindow.setAlwaysOnTop(e.checked);
          },
          checked: store.get('options.alwaysOnTop')
        },
        {
          label: 'Frameless Window *',
          type: 'checkbox',
          click(e) {
            store.set('options.hideWindowFrame', e.checked);
            electronLog.info('Relaunching Quark Player...');
            app.emit('relaunch');
          },
          checked: store.get('options.hideWindowFrame')
            ? store.get('options.hideWindowFrame')
            : false
        },
        {
          label: 'Remember Window Details',
          type: 'checkbox',
          click(e) {
            if (store.get('options.windowDetails')) {
              store.delete('options.windowDetails');
            } else {
              store.set('options.windowDetails', {});
            }
          },
          checked: !!store.get('options.windowDetails')
        },
        {
          label: 'Picture In Picture *',
          type: 'checkbox',
          click(e) {
            store.set('options.pictureInPicture', e.checked);
            electronLog.info('Relaunching Quark Player...');
            app.emit('relaunch');
          },
          checked: store.get('options.pictureInPicture')
            ? store.get('options.pictureInPicture')
            : false,
          visible: process.platform === 'darwin' || process.platform === 'linux' || process.platform === 'win32'
        },
        {
          label: 'Enable AdBlocker *',
          type: 'checkbox',
          click(e) {
            store.set('options.adblock', e.checked);

            // Store details to remeber when relaunched
            if (mainWindow.getURL() != '') {
              store.set('relaunch.toPage', mainWindow.getURL());
            }
            store.set('relaunch.windowDetails', {
              position: mainWindow.getPosition(),
              size: mainWindow.getSize()
            });

            // Restart the app
            electronLog.info('Relaunching Quark Player...');
            app.relaunch();
            app.quit();
          },
          checked: store.get('options.adblock')
            ? store.get('options.adblock')
            : false
        },
        {
          label: 'Start in Fullscreen',
          type: 'checkbox',
          click(e) {
            store.set('options.launchFullscreen', e.checked);
          },
          checked: store.get('options.launchFullscreen')
            ? store.get('options.launchFullscreen')
            : false
        },
        {
          label: 'Enabled Services',
          submenu: enabledServicesMenuItems
        },
        {
          label: 'Default Service',
          submenu: [
            {
              label: 'Menu',
              type: 'checkbox',
              click(e) {
                e.menu.items.forEach(e => {
                  if (!(e.label === 'Menu')) e.checked = false;
                });
                store.delete('options.defaultService');
              },
              checked: store.get('options.defaultService') === undefined
            },
            {
              label: 'Last Opened Page',
              type: 'checkbox',
              click(e) {
                e.menu.items.forEach(e => {
                  if (!(e.label === 'Last Opened Page')) e.checked = false;
                });
                store.set('options.defaultService', 'lastOpenedPage');
              },
              checked: store.get('options.defaultService') === 'lastOpenedPage'
            },
            { type: 'separator' }
          ].concat(defaultServiceMenuItems)
        },
        {
          label: 'Edit Config File',
          click() {
            store.openInEditor();
          }
        },
        {
          label: 'Reset all Settings *',
          click() {
            // Reset Config
            store.clear();

            // Clear Engine Cache
            let engineCachePath = path.join(
              app.getPath('userData'),
              'adblock-engine-cache.txt'
            );
            fs.access(engineCachePath, fs.constants.F_OK, (err) => {
              if (!err) {
                fs.unlinkSync(engineCachePath);
              }
            });

            // Restart the app
            electronLog.warn('Note: Reset All Settings!');
            electronLog.info('Relaunching Quark Player...');
            app.relaunch();
            app.quit();
          }
        },
        { label: '* Requires an App Restart', enabled: false }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteandmatchstyle' },
        { role: 'delete' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Go Back',
          accelerator: 'Alt+Left',
          click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.webContents.goBack();
            electronLog.info('Navigated back');
          }
        },
        {
          label: 'Go Forward',
          accelerator: 'Alt+Right',
          click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.webContents.goForward();
            electronLog.info('Navigated forward');
          }
        },
        {
          label: 'New Window',
          accelerator: 'CmdorCtrl+N',
          click(item) {
            app.emit('new-window');
          }
        },
        {
          label: 'Close Window',
          accelerator: 'CmdorCtrl+W',
          click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.close();
            electronLog.info('Closed a window');
          }
        },
        {
          type: 'separator'
        },
        {
          role: 'zoomin'
        },
        {
          role: 'zoomout'
        },
        {
          role: 'resetzoom'
        },
        {
          type: 'separator'
        },
        {
          role: 'togglefullscreen'
        }
      ]
    },
    {
      label: 'Developer',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.webContents.reload();
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click(item, focusedWindow) {
            if (focusedWindow) focusedWindow.webContents.reloadIgnoringCache();
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator:
            process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click(item, focusedWindow) {
            focusedWindow.webContents.toggleDevTools();
          }
        },
        {
          label: 'Open Developer Tools (Detached)',
          accelerator:
            process.platform === 'darwin' ? 'CmdorCtrl+Shift+F12' : 'F12',
          click(item) {
            mainWindow.webContents.openDevTools({ mode: 'detach' });
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'View humans.txt',
          accelerator: 'CmdorCtrl+Alt+Shift+H',
          click() {
            const humansWindow = new BrowserWindow({width: 500, height: 600, title: "Humans.txt"});
            humansWindow.loadFile('./ui/humans.txt');
            electronLog.info('Opened humans.txt :)');
          }
        },
        {
          label: 'Open chrome://gpu',
          accelerator: 'CmdorCtrl+Alt+G',
          click() {
            const gpuWindow = new BrowserWindow({width: 900, height: 700, title: "GPU Internals"});
            electronLog.info('Opening chrome://gpu');
            gpuWindow.loadURL('chrome://gpu');
          }
        },
        {
          label: 'Relaunch App',
          click() {
            electronLog.warn('Restarting Electron...');
            app.relaunch();
            app.quit();
          }
        }
      ]
    },
    {
      role: 'help',
      label: 'About',
      submenu: [
        { label: 'Quark Player v' + app.getVersion(), enabled: false },
        { label: 'Created by Oscar Beaumont &&',
            click() {
            shell.openExternal(
              'https://github.com/oscartbeaumont/ElectronPlayer#readme'
            );
            electronLog.info('Opened external browser');
          }
        },
        { label: 'Maintained by Alex313031',
            click() {
            shell.openExternal(
              'https://github.com/Alex313031/quarkplayer#readme'
            );
            electronLog.info('Opened external browser');
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'About App',
          accelerator: 'CmdorCtrl+Alt+Shift+A',
          click(item) {
            //mainWindow.webContents.loadFile('./ui/about.html');
            const aboutWindow = new BrowserWindow({
              width: 500,
              height: 504,
              webPreferences: {
                nodeIntegration: false,
                nodeIntegrationInWorker: false,
                contextIsolation: false,
                sandbox: false,
                experimentalFeatures: true,
                webviewTag: true,
                devTools: true,
                javascript: true,
                plugins: true,
                enableRemoteModule: true,
                preload: path.join(__dirname, 'client-preload.js'),
                nativeWindowOpen: true
              },
            });
            require("@electron/remote/main").enable(aboutWindow.webContents);
            aboutWindow.loadFile('./ui/about.html');
            electronLog.info('Opened about.html');
            electronLog.info(`App Version: ` + appVersion);
          }
        }
      ]
    }
  ]);
};
