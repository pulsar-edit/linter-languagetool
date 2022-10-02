/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
import { BufferedProcess, CompositeDisposable, Emitter } from 'atom';
import url from 'url';
import fs from 'fs';
import rp from 'request-promise-native';

var LTServerHelper = (function() {
  let PUBLIC_LT_URL = undefined;
  LTServerHelper = class LTServerHelper {
    static initClass() {
      PUBLIC_LT_URL = 'https://languagetool.org/api/v2/check';
    }

    init() {
      this.disposables = new CompositeDisposable;
      this.emitter = new Emitter;
      this.url = PUBLIC_LT_URL;

      // Register for LanguageServer Settings Changes
      this.disposables.add(atom.config.onDidChange('linter-languagetool.languagetoolServerPath', ({newValue, oldValue}) => {
        return this.handlelanguagetoolServerPathSetting();
      })
      );

      this.disposables.add(atom.config.onDidChange('linter-languagetool.configFilePath', ({newValue, oldValue}) => {
        return this.handlelanguagetoolServerPathSetting();
      })
      );

      this.disposables.add(atom.config.onDidChange('linter-languagetool.languagetoolServerPort', ({newValue, oldValue}) => {
        return this.handlelanguagetoolServerPathSetting();
      })
      );

      return this.handlelanguagetoolServerPathSetting();
    }

    destroy() {
      this.stopserver();
      this.disposables.dispose();
      this.disposables = null;
      this.emitter.dispose();
      return this.emitter = null;
    }

    onDidChangeLTInfo(callback) {
      return this.emitter.on('did-change-ltinfo', callback);
    }

    setltinfo(info) {
      if (info !== this.ltinfo) {
        this.ltinfo = info;
        this.emitter.emit('did-change-ltinfo', this.ltinfo);
      }
      return this.ltinfo;
    }

    useLTServerWithUrl(url) {
      this.url = url;
      return new Promise( (resolve, reject) => {
        return this.getServerInfo().then( info => resolve(info)).catch( err => {
          if (this.url === PUBLIC_LT_URL) {
            // The public server fails
            atom.notifications.addError(`The public languagetool server is
not responding. The linter will be disabled.`,
              {detail: err.message});
            return reject(err);
          } else if (atom.config.get('linter-languagetool.fallbackToPublicApi')) {
            // Some local error, use the public server
            atom.notifications.addWarning(`There is some problem with your
langugetool server. The linter will use the public url.`,
              {detail: err.message});
            this.url = PUBLIC_LT_URL;
            return this.getServerInfo().then( info => resolve(info)).catch( function(err) {
              atom.notifications.addError(`The public languagetool server is
not responding. The linter will be disabled.`,
                {detail: err.message});
              return reject(err);
            });
          } else {
            atom.notifications.addError(`There is some problem with your
langugetool server. The linter will not use the public url and
hence might not work correctly.`,
              {detail: err.message});
            return reject(err);
          }
        });
      });
    }

    handlelanguagetoolServerPathSetting() {
      const path = atom.config.get('linter-languagetool.languagetoolServerPath');
      this.stopserver();
      this.setltinfo(undefined);

      if (path != null ? path.startsWith('http') : undefined) {
        return this.useLTServerWithUrl( url.resolve(path, 'v2/check') );
      }

      if (path != null ? path.endsWith('.jar') : undefined) {
        // Test if the file exits
        try {
          fs.accessSync(path);
        } catch (error) {
          atom.notifications.addWarning(`${path} not found. Using
public server.`);
          return this.useLTServerWithUrl(PUBLIC_LT_URL);
        }
        return new Promise( (resolve, reject) => {
          let port = atom.config.get('linter-languagetool.languagetoolServerPort');
          if (port == null) { port = 8081; }
          return this.startserver(port).then(  () => {
            return this.useLTServerWithUrl(`http://localhost:${port}/v2/check`).then( () => resolve());
          }).catch( () => {
            console.log("exception");
            this.stopserver();
            atom.notifications.addWarning(`Unable to start the local
server. Using the public server.`);
            return this.useLTServerWithUrl(PUBLIC_LT_URL).then( () => resolve());
          });
        });
      }
      // Default return
      return this.useLTServerWithUrl(PUBLIC_LT_URL);
    }

    getServerInfo() {
      const options = {
        method: 'POST',
        uri: this.url,
        form: {
          language: 'en-US',
          text: 'a simple test'
        },
        json: true
      };
      return new Promise(( (resolve, reject) => {
        return rp(options)
          .then( data => {
            this.setltinfo(data.software);
            this.emitter.emit('did-change-ltinfo', this.ltinfo);
            return resolve(this.ltinfo);
          })
          .catch( err => reject(err));
        })
      );
    }

    startserver(port) {
      if (port == null) { port = 8081; }
      const ltjar = atom.config.get('linter-languagetool.languagetoolServerPath');

      let command = 'java';
      if (process.platform === 'win32') {
        command = 'javaw';
      }

      let jvmoptions = [];
      if (atom.config.get('linter-languagetool.jvmOptions')) {
        jvmoptions = [atom.config.get('linter-langugetool.jvmOptions')];
      }

      const args = jvmoptions.concat(['-cp', ltjar, 'org.languagetool.server.HTTPServer', '--port', port]);
      if (atom.config.get('linter-languagetool.configFilePath')) {
        args.push(...Array.from(['--config', atom.config.get('linter-languagetool.configFilePath')] || []));
      }

      return new Promise( (resolve, reject) => {
        const stdout = function(output) {
          if (/Server started/.test(output)) {
            return resolve();
          }
        };
        const stderr = function(output) {};

        const exit = output => // Can be a for example port errors, if another server is already running
        // or config file not found errors.
        reject();

        return this.ltserver = new BufferedProcess({
          command,
          args,
          options: {
            detached: true
          },
          stdout,
          stderr,
          exit
        });
      });
    }

    stopserver() {
      if (this.ltserver != null) {
        this.ltserver.kill();
      }
      return this.ltserver = undefined;
    }
  };
  LTServerHelper.initClass();
  return LTServerHelper;
})();

export default new LTServerHelper();
