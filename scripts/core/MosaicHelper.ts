/**
 * @author Simon Urli <simon@pulsetotem.fr>
 */

/// <reference path="../../t6s-core/core-backend/scripts/Logger.ts" />

var request = require('request');
var fs : any = require('fs');
var uuid = require('uuid');
var PythonShell = require('python-shell');

var MosaicScript = "./resources/mosaic.py";

class MosaicHelper {

    private _lastPicId : string;
    private _countPic : number;
    private _cmsAlbum : string;
    private _tilesPath : string;
    private _inputPath : string;
    private _outputPath : string;

    constructor(cmsAlbum : string, inputImage : string) {
        this._cmsAlbum = cmsAlbum;
        this._tilesPath = ServiceConfig.getTmpFilePath()+uuid.v1()+"/";
        this._countPic = 0;
        this._lastPicId = null;
        this.downloadInputImage(inputImage);
    }

    private downloadInputImage(inputImage : string) {
        var self = this;
        var filename = this.getFilename(inputImage);
        var inputPath = ServiceConfig.getTmpFilePath()+filename;
        var outputPath = ServiceConfig.getTmpFilePath()+"mosaic_"+filename;

        var fail = function (err) {
            Logger.error("Error while downloading input picture from "+inputImage);
            Logger.debug(err);
        };

        var success = function () {
            self._inputPath = inputPath;
            self._outputPath = outputPath;
        };

        this.downloadFile(inputImage, inputPath, success, fail);
    }

    private getFilename(url : string) : string {
       var indexLastSlash = url.lastIndexOf('/');


        return url.substring(indexLastSlash+1);
    }

    private downloadFile(url, localPath, callbackSuccess, callbackError) {
        var self = this;
        request.head(url, function(err, res, body){
            if (err) {
                callbackError(err);
            } else {
                request(url).pipe(fs.createWriteStream(localPath)).on('close', callbackSuccess);
            }
        });
    }

    public downloadFiles(urls : Array<String>, lastPicId : String, callback : Function) {
        var self = this;
        var internalCounter = 0;
        var nbUrls = urls.length;

        var fail = function (err) {
            internalCounter++;
            Logger.debug("Error while downloading picture");
            Logger.debug(err);

            if (internalCounter == (nbUrls-1)) {
                callback();
            }
        };

        var success = function () {
            internalCounter++;
            self._countPic++;
            if (internalCounter == (nbUrls-1)) {
                callback();
            }
        };

        urls.forEach(function (url : string) {
            var path = self._tilesPath + self.getFilename(url);
            self.downloadFile(url, path, success, fail);
        });
    }

    public computeMosaic(successCallback : Function, failCallback : Function) {
        var options = {
            mode: 'text',
            args: [this._inputPath, this._tilesPath, this._outputPath]
        };
        var pyshell = new PythonShell(MosaicScript, options);

        pyshell.on('message', function (message) {
            // received a message sent from the Python script (a simple "print" statement)
            Logger.debug(message);
        });

        pyshell.end(function (err) {
            if (err) {
                failCallback(err);
            } else {
                successCallback();
            }
        });
    }


}