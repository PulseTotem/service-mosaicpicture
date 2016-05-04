/**
 * @author Christian Brel <christian@pulsetotem.fr, ch.brel@gmail.com>
 */

/// <reference path="../../t6s-core/core-backend/scripts/Logger.ts" />

var fs = require('fs');

/**
 * Contains Service Configuration information.
 *
 * @class ServiceConfig
 */
class ServiceConfig {

	/**
	 * CMS Host.
	 *
	 * @property cmsHost
	 * @type string
	 * @static
	 */
	static cmsHost : string = "";

	/**
	 * CMS Auth Key.
	 *
	 * @property cmsAuthKey
	 * @type string
	 * @static
	 */
	static cmsAuthKey : string = "";

	/**
	 * Statistic service host
	 * @type {string}
	 * @static
     */
	static statHost : string = "";

	/**
	 * Path for temp files
	 *
	 * @static
	 * @type {string}
     */
	static tmpFilePath : string = "";

	/**
	 * Retrieve configuration information from file description.
	 *
	 * @method retrieveConfigurationInformation
	 * @static
	 */
	static retrieveConfigurationInformation() {
		if(ServiceConfig.cmsHost == "" && ServiceConfig.cmsAuthKey == "") {
			var file = __dirname + '/service_config.json';
			try {
				var configInfos = JSON.parse(fs.readFileSync(file, 'utf8'));
				ServiceConfig.cmsHost = configInfos.cmsHost;
				ServiceConfig.cmsAuthKey = configInfos.cmsAuthKey;
				ServiceConfig.statHost = configInfos.statHost;
				ServiceConfig.tmpFilePath = configInfos.tmpFilePath;
			} catch (e) {
				Logger.error("Service configuration file can't be read.");
				Logger.debug(e);
			}
		}
	}

	/**
	 * Return CMS Host.
	 *
	 * @method getCMSHost
	 * @static
	 * @return {string} - CMS Host.
	 */
	static getCMSHost() : string {
		ServiceConfig.retrieveConfigurationInformation();
		return ServiceConfig.cmsHost;
	}

	/**
	 * Return CMS Auth Key.
	 *
	 * @method getCMSAuthKey
	 * @static
	 * @return {string} - CMS Auth Key.
	 */
	static getCMSAuthKey() : string {
		ServiceConfig.retrieveConfigurationInformation();
		return ServiceConfig.cmsAuthKey;
	}

	/**
	 * Return host for statistics
	 * @static
	 * @returns {string} Stat host
     */
	static getStatHost() : string {
		ServiceConfig.retrieveConfigurationInformation();
		return ServiceConfig.statHost;
	}

	/**
	 * Return temporary path for file
	 * @static
	 * @returns {string} Temp path file
     */
	static getTmpFilePath() : string {
		ServiceConfig.retrieveConfigurationInformation();
		return ServiceConfig.tmpFilePath;
	}
}