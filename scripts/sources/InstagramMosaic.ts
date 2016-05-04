/**
 * @author Simon Urli <simon@pulsetotem.fr>
 */

/// <reference path="../../t6s-core/core-backend/libsdef/node-uuid.d.ts" />
/// <reference path="../../t6s-core/core-backend/scripts/Logger.ts" />

/// <reference path="../MosaicpictureNamespaceManager.ts" />

class InstagramMosaic extends SourceItf {

	/**
	 * Constructor.
	 *
	 * @param {Object} params - Source's params.
	 * @param {DailymotionNamespaceManager} dailymotionNamespaceManager - NamespaceManager attached to Source.
	 */
	constructor(params : any, mosaicpictureNamespaceManager : MosaicpictureNamespaceManager) {
		super(params, mosaicpictureNamespaceManager);

		if (this.checkParams(["Limit","InfoDuration","SearchQuery","oauthKey"])) {
			this.run();
		}

		this.getSourceNamespaceManager().socket.id;
	}

	run() {
		var self = this;

		Logger.debug("TaggedPictures Action with params :");
		Logger.debug(this.getParams());

		var failManageOAuth = function(error) {
			Logger.error("Error during the request manage OAuth");
			if(error) {
				Logger.error(error);
			}
		};

		var success = function(oauthActions) {

			var failGet = function(error) {
				Logger.error("Error during the request get");
				if(error) {
					Logger.error(error);
				}
			};

			var successSearch = function (information) {

				var pictureAlbum : PictureAlbum = new PictureAlbum();
				var listPhotos = information.data;

				var limit = parseInt(self.getParams().Limit);

				if (listPhotos.length < limit) {
					limit = listPhotos.length;
				}

				var infoDuration = parseInt(self.getParams().InfoDuration);

				var totalDuration = limit*infoDuration;

				pictureAlbum.setId(uuid.v1());
				pictureAlbum.setPriority(0);
				pictureAlbum.setDurationToDisplay(totalDuration);

				for (var i = 0; i < limit; i++) {
					var photo = listPhotos[i];

					if (photo.type == "image") {
						var pic : Picture = new Picture(photo.id);

						pic.setCreationDate(new Date(photo.created_time));
						pic.setDurationToDisplay(infoDuration);
						//pic.setDescription(photo.description._content);
						pic.setTitle(photo.caption.text);

						var images = photo.images;

						var low_reso = new PictureURL(photo.id+"_lowresolution");
						low_reso.setURL(images.low_resolution.url);
						low_reso.setHeight(images.low_resolution.height);
						low_reso.setWidth(images.low_resolution.width);

						var stand_reso = new PictureURL(photo.id+"_standardresolution");
						stand_reso.setURL(images.standard_resolution.url);
						stand_reso.setHeight(images.standard_resolution.height);
						stand_reso.setWidth(images.standard_resolution.width);

						var thumb = new PictureURL(photo.id+"thumbnail");
						thumb.setURL(images.thumbnail.url);
						thumb.setHeight(images.thumbnail.height);
						thumb.setWidth(images.thumbnail.width);

						pic.setMedium(stand_reso);
						pic.setOriginal(stand_reso);
						pic.setSmall(low_reso);
						pic.setThumb(thumb);

						var picUser = photo.user;

						var user : User = new User(picUser.id);
						user.setUsername(picUser.username);
						user.setRealname(picUser.full_name);
						user.setProfilPicture(picUser.profile_picture);
						pic.setOwner(user);

						pictureAlbum.addPicture(pic);
					}
				}

				Logger.debug("Send PictureAlbum to client : ");
				Logger.debug(pictureAlbum);

				self.getSourceNamespaceManager().sendNewInfoToClient(pictureAlbum);
			};


			var userPhoto = 'https://api.instagram.com/v1/tags/'+self.getParams().SearchQuery+'/media/recent?count='+self.getParams().Limit;

			Logger.debug("Get with the following URL : "+userPhoto);
			oauthActions.get(userPhoto, successSearch, failGet);
		};

		self.getSourceNamespaceManager().manageOAuth('instagram', self.getParams().oauthKey, success, failManageOAuth);
	}
}