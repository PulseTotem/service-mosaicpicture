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

		if (this.checkParams(["InfoDuration", "Limit"])) {
			this.run();
		}
	}

	public run() {
		var self = this;




	}
}