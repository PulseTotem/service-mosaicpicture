/**
 * @author Simon Urli <simon@pulsetotem.fr>
 */

/// <reference path="../../t6s-core/core-backend/scripts/Logger.ts" />
/// <reference path="../../t6s-core/core-backend/scripts/RestClient.ts" />
/// <reference path="../../t6s-core/core-backend/scripts/RestClientResponse.ts" />

var request = require('request');
var fs : any = require('fs');
var uuid : any = require('node-uuid');
var PythonShell = require('python-shell');

var MosaicScript = "./resources/mosaic.py";

class MosaicHelper {

    static helpers : any = {};

    private _max_pic_id : string;
    private _min_pic_id : string;
    private _countPic : number;
    private _tilesPath : string;
    private _inputPath : string;
    private _outputPath : string;
    private _lookBackward : boolean;
    private _socketId : string;
    private _cmsAlbumId : string;
    private _mosaicHasBeenProcessed : boolean;
    private _imageName : string;

    constructor(cmsAlbumid : string, inputImage : string, lookBackward : boolean, socketId : string) {
        this.initDir();
        this._countPic = 0;
        this._max_pic_id = null;
        this._min_pic_id = null;
        this._socketId = socketId;
        this._lookBackward = lookBackward;
        this._cmsAlbumId = cmsAlbumid;
        this._mosaicHasBeenProcessed = false;
        this.downloadInputImage(inputImage);
        MosaicHelper.helpers[socketId] = this;
    }

    // TODO: use SDI / Profil Id instead of a random dir
    private initDir() {
        var tmpDir = uuid.v1();
        var path = ServiceConfig.getTmpFilePath()+tmpDir+"/";
        fs.mkdirSync(path);
        this._tilesPath = path;
    }

    public getCountPic() : number {
        return this._countPic;
    }

    public getMaxPicId() : string {
        return this._max_pic_id;
    }

    public getMinPicId() : string {
        return this._min_pic_id;
    }

    public lookBackward() : boolean {
        return this._lookBackward;
    }

    public turnOffLookBackward() {
        this._lookBackward = false;
    }

    public getOutputPath() {
        return this._outputPath;
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
            self._imageName = filename;
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

    public downloadFiles(urls : Array<string>, lastPicId : string, firstPicId : string, callback : Function) {
        var self = this;
        var internalCounter = 0;
        var nbUrls = urls.length;
        this._max_pic_id = lastPicId;
        this._min_pic_id = firstPicId;

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
        var self = this;
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
                self._mosaicHasBeenProcessed = true;
                successCallback();
            }
        });
    }

    private static base64_encode(file) {
        // read binary data
        var bitmap = fs.readFileSync(file);
        // convert binary data to base64 encoded string
        return new Buffer(bitmap).toString('base64');
    }

    public postPictureToCMS(successCallback : Function, failCallback : Function) {
        var self = this;

        if (!this._mosaicHasBeenProcessed) {
            failCallback("Mosaic has not been processed yet.");
        } else {
            var postPhotoUrl = ServiceConfig.getCMSHost() + "admin/images_collections/"+this._cmsAlbumId+"/images/";

            var b64datas = MosaicHelper.base64_encode(this._outputPath);


            var imageDatas = {
                name: self._imageName,
                description: self._imageName,
                file: b64datas
            };

            var fail = function (error : RestClientResponse) {
                failCallback(error.data());
            };

            var successPostPicture = function (imageObjectResponse : RestClientResponse) {
                var imageObject = imageObjectResponse.data();
                Logger.debug("Obtained picture info: "+imageObject);
                self._outputPath = ServiceConfig.getCMSHost() + "images/" + imageObject.id + "/raw?size=medium";
                successCallback();
            };

            Logger.debug("Post picture "+self._outputPath+" to "+postPhotoUrl);
            RestClient.post(postPhotoUrl, imageDatas, successPostPicture, fail, ServiceConfig.getCMSAuthKey());
        }
    }

    public cleanPictures() {
        var self = this;
        try {
            if (this._tilesPath != null) {
                var tiles : Array<string> = fs.readdirSync(this._tilesPath);

                tiles.forEach(function (tile : string) {
                    var path = this._tilesPath+tile;
                    fs.unlinkSync(path);
                });

                fs.rmdirSync(this._tilesPath);
                fs.unlinkSync(this._inputPath);

                this._tilesPath = null;
                this._inputPath = null;
                Logger.debug("Cleaning pictures ok");
            }
        } catch (err) {
            Logger.error("Error while cleaning pictures...");
            Logger.debug(err);
        }
    }

    public static getHelper(socketId : string) : MosaicHelper {
        var helper = MosaicHelper.helpers[socketId];

        if (helper) {
            return helper;
        } else {
            return null;
        }
    }

    public static removeHelper(socketId : string) {
        Logger.debug("Remove helper "+socketId);
        var mosaicHelper = MosaicHelper.getHelper(socketId);
        if (mosaicHelper != null) {
            mosaicHelper.cleanPictures();
            delete MosaicHelper.helpers[socketId];
        }
    }
}