/**
 * @author Simon Urli <simon@pulsetotem.fr>
 */

/// <reference path="../../t6s-core/core-backend/libsdef/node-uuid.d.ts" />
/// <reference path="../../t6s-core/core-backend/scripts/Logger.ts" />
/// <reference path="../../t6s-core/core-backend/scripts/server/SourceItf.ts" />
/// <reference path="../../t6s-core/core-backend/t6s-core/core/scripts/infotype/CmdList.ts" />
/// <reference path="../../t6s-core/core-backend/t6s-core/core/scripts/infotype/Cmd.ts" />
/// <reference path="../core/MosaicHelper.ts" />
/// <reference path="../MosaicpictureNamespaceManager.ts" />
/// <reference path="../../t6s-core/core-backend/scripts/RestClient.ts" />

var uuid : any = require('node-uuid');

class BeepeersMosaic extends SourceItf {

    /**
     * Constructor.
     *
     * @param {Object} params - Source's params.
     * @param {DailymotionNamespaceManager} dailymotionNamespaceManager - NamespaceManager attached to Source.
     */
    constructor(params:any, mosaicpictureNamespaceManager:MosaicpictureNamespaceManager) {
        super(params, mosaicpictureNamespaceManager);

        if (this.checkParams(["Limit", "InfoDuration", "PictureURL", "LookBackward", "CMSAlbumId", "TextValue", "ApiKey"])) {
            this.run();
        }
    }

    run() {
        var self = this;

        var socketId:string = this.getSourceNamespaceManager().socket.id;
        var limit = parseInt(self.getSourceNamespaceManager().getParams().Limit);
        var infoDuration = parseInt(self.getSourceNamespaceManager().getParams().Limit);
        var pictureUrl = self.getSourceNamespaceManager().getParams().PictureURL;
        var lookBackward = (self.getSourceNamespaceManager().getParams().LookBackward == "true");
        var CMSAlbumId = self.getSourceNamespaceManager().getParams().CMSAlbumId;
        var textValue = self.getSourceNamespaceManager().getParams().TextValue;
        var apiLimit = 20;
        var apiKey = this.getParams().ApiKey;


        var mosaichelper:MosaicHelper = MosaicHelper.getHelper(socketId);

        var infoList:CmdList = new CmdList(uuid.v1());
        infoList.setDurationToDisplay(infoDuration);

        if (mosaichelper == null) {
            mosaichelper = new MosaicHelper(CMSAlbumId, pictureUrl, lookBackward, socketId);
        }

        if (mosaichelper.getMosaicHasBeenProcessed()) {
            var cmdInfo:Cmd = new Cmd(socketId);
            cmdInfo.setCmd("mosaicProcessed");
            var args:Array<string> = [];
            args.push(mosaichelper.getOutputPath());

            cmdInfo.setArgs(args);
            cmdInfo.setDurationToDisplay(infoDuration);

            infoList.addCmd(cmdInfo);
            self.getSourceNamespaceManager().sendNewInfoToClient(infoList);
        } else {
            // if limits of picture is not reached, some picture have to be retrieved
            if (mosaichelper.getCountPic() < limit) {
                var failGet = function(error : RestClientResponse) {
                    Logger.error("Error during the request get");
                    if(error.data()) {
                        Logger.error(error.data());
                    }
                };

                var successSearch = function (response : RestClientResponse) {
                    var listPhotos = response.data();
                    var urlPics = [];
                    var lastPicId;

                    if (listPhotos.length == 0) {
                        mosaichelper.turnOffLookBackward();
                    } else {
                        for (var i = 0; i < listPhotos.length; i++) {
                            var photo = listPhotos[i];
                            if (photo.mediaId == mosaichelper.getMaxPicId()) {
                                mosaichelper.turnOffLookBackward();
                                break;
                            } else {
                                if (i == 0) {
                                    lastPicId = photo.mediaId;
                                }
                                urlPics.push(photo.url);
                            }
                        }

                        var callback = function () {
                            Logger.debug("Finish to upload pictures new counter: "+mosaichelper.getCountPic());

                            var cmdInfo : Cmd = new Cmd(socketId);
                            cmdInfo.setCmd("counterMosaic");
                            var args : Array<string> = [];
                            args.push(mosaichelper.getCountPic().toString());
                            args.push(limit.toString());
                            args.push(textValue);

                            cmdInfo.setArgs(args);
                            cmdInfo.setDurationToDisplay(infoDuration);

                            infoList.addCmd(cmdInfo);
                            self.getSourceNamespaceManager().sendNewInfoToClient(infoList);
                        };

                        if (urlPics.length > 0) {
                            mosaichelper.downloadFiles(urlPics, lastPicId, null, callback);
                        }
                    }
                };


                var urlApi = 'https://beepeers.com/api/v2/media/last?nbResults='+apiLimit;

                if (mosaichelper.lookBackward() && mosaichelper.getMinPicId() != null) {
                    urlApi += '&startIndex='+mosaichelper.getCountPic();
                }

                Logger.debug("Get with the following URL : "+urlApi);

                RestClient.get(urlApi, successSearch, failGet, apiKey);
            }
        }
    }
}