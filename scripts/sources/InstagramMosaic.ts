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

var uuid : any = require('node-uuid');

class InstagramMosaic extends SourceItf {

	/**
	 * Constructor.
	 *
	 * @param {Object} params - Source's params.
	 * @param {DailymotionNamespaceManager} dailymotionNamespaceManager - NamespaceManager attached to Source.
	 */
	constructor(params : any, mosaicpictureNamespaceManager : MosaicpictureNamespaceManager) {
		super(params, mosaicpictureNamespaceManager);

		if (this.checkParams(["Limit","InfoDuration","SearchQuery","oauthKey","PictureURL","LookBackward","CMSAlbumId","TextValue"])) {
			this.run();
		}
	}

	run() {
		var self = this;

		var socketId:string = this.getSourceNamespaceManager().socket.id;
		var limit = parseInt(self.getSourceNamespaceManager().getParams().Limit);
		var infoDuration = parseInt(self.getSourceNamespaceManager().getParams().Limit);
		var searchQuery = self.getSourceNamespaceManager().getParams().SearchQuery;
		var oAuthKey = self.getSourceNamespaceManager().getParams().oauthKey;
		var pictureUrl = self.getSourceNamespaceManager().getParams().PictureURL;
		var lookBackward = (self.getSourceNamespaceManager().getParams().LookBackward == "true");
		var CMSAlbumId = self.getSourceNamespaceManager().getParams().CMSAlbumId;
		var textValue = self.getSourceNamespaceManager().getParams().TextValue;
		var apiLimit = 20;

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
				var failManageOAuth = function(error) {
					Logger.error("Error during the request manage OAuth");
					if(error) {
						Logger.error(error);
					}
				};

				var successManageOAuth = function(oauthActions) {

					var failGet = function(error) {
						Logger.error("Error during the request get");
						if(error) {
							Logger.error(error);
						}
					};

					var successSearch = function (information) {
						var listPhotos = information.data;
						var urlPics = [];
						var lastPicId = information.pagination.next_max_id;
						var firstPicId = information.pagination.next_min_id;

						if (listPhotos.length == 0) {
							mosaichelper.turnOffLookBackward();
						} else {
							for (var i = 0; i < listPhotos.length; i++) {
								var photo = listPhotos[i];
								if (photo.type == "image") {
									urlPics.push(photo.images.standard_resolution.url);
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
								mosaichelper.downloadFiles(urlPics, lastPicId, firstPicId, callback);
							}
						}
					};


					var urlApi = 'https://api.instagram.com/v1/tags/'+searchQuery+'/media/recent?count='+apiLimit;

					if (mosaichelper.lookBackward() && mosaichelper.getMinPicId() != null) {
						urlApi += '&min_tag_id='+mosaichelper.getMinPicId();
					}

					if (!mosaichelper.lookBackward() && mosaichelper.getMaxPicId() != null) {
						urlApi += '&max_tag_id='+mosaichelper.getMaxPicId();
					}

					Logger.debug("Get with the following URL : "+urlApi);
					oauthActions.get(urlApi, successSearch, failGet);
				};

				self.getSourceNamespaceManager().manageOAuth('instagram', self.getParams().oauthKey, successManageOAuth, failManageOAuth);

				// if limits of picture is reached, we can process picture to create the image
			} else {
				var successComputeMosaic = function () {
					Logger.debug("Mosaic computed with success... Send to CMS");

					var failPostToCMS = function (err) {
						Logger.error("Error while posting picture to CMS");
						Logger.debug(err);
					};

					var successPostToCMS = function () {
						Logger.debug("Success when posting to CMS");
						mosaichelper.cleanPictures();
						var cmdInfo : Cmd = new Cmd(socketId);
						cmdInfo.setCmd("mosaicProcessed");
						cmdInfo.setPriority(InfoPriority.HIGH);
						var args : Array<string> = [];
						args.push(mosaichelper.getOutputPath());

						cmdInfo.setArgs(args);
						cmdInfo.setDurationToDisplay(infoDuration);

						infoList.addCmd(cmdInfo);
						self.getSourceNamespaceManager().sendNewInfoToClient(infoList);
					};

					mosaichelper.postPictureToCMS(successPostToCMS, failPostToCMS);
				};

				var failComputeMosaic = function (err) {
					Logger.error("Error while computing mosaic");
					Logger.debug(err);
				};

				var cmdInfo : Cmd = new Cmd(socketId);
				cmdInfo.setCmd("startProcessing");
				cmdInfo.setPriority(InfoPriority.HIGH);
				cmdInfo.setDurationToDisplay(infoDuration);

				infoList.addCmd(cmdInfo);
				self.getSourceNamespaceManager().sendNewInfoToClient(infoList);

				mosaichelper.computeMosaic(successComputeMosaic, failComputeMosaic);
			}
		}
	}
}