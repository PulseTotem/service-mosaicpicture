/**
 * @author Simon Urli <simon@pulsetotem.fr>
 */

/// <reference path="./sources/InstagramMosaic.ts" />

/**
 * Represents the MosaicPicture's SourceNamespaceManager.
 *
 * @class MosaicpictureNamespaceManager
 * @extends SourceNamespaceManager
 */
class MosaicpictureNamespaceManager extends SourceNamespaceManager {

    /**
     * Constructor.
     *
     * @constructor
     * @param {any} socket - The socket.
     */
    constructor(socket : any) {
        super(socket);
	    this.addListenerToSocket('InstagramMosaic', function(params : any, self : MosaicpictureNamespaceManager) { (new InstagramMosaic(params, self)) });
    }
}