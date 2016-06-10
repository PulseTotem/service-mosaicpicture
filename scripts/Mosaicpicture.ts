/**
 * @author Simon Urli <simon@pulsetotem.fr>
 */

/// <reference path="../t6s-core/core-backend/scripts/server/SourceServer.ts" />
/// <reference path="../t6s-core/core-backend/scripts/Logger.ts" />

/// <reference path="./MosaicpictureNamespaceManager.ts" />



/**
 * Represents the PulseTotem Mosaicpicture's Service.
 *
 * @class Dailymotion
 * @extends SourceServer
 */
class Mosaicpicture extends SourceServer {

    /**
     * Constructor.
     *
     * @param {number} listeningPort - Server's listening port..
     * @param {Array<string>} arguments - Server's command line arguments.
     */
    constructor(listeningPort : number, arguments : Array<string>) {
        super(listeningPort, arguments);

        this.init();
    }

    /**
     * Method to init the Twitter server.
     *
     * @method init
     */
    init() {
        var self = this;
        this.addNamespace("Mosaicpicture", MosaicpictureNamespaceManager);
    }
}

/**
 * Server's Dailymotion listening port.
 *
 * @property _DailymotionListeningPort
 * @type number
 * @private
 */
var _MosaicpictureListeningPort : number = process.env.PORT || 6022;

/**
 * Server's Dailymotion command line arguments.
 *
 * @property _DailymotionArguments
 * @type Array<string>
 * @private
 */
var _MosaicpictureArguments : Array<string> = process.argv;

var serverInstance = new Mosaicpicture(_MosaicpictureListeningPort, _MosaicpictureArguments);
serverInstance.run();