/**
 * Errl API Library
 * 2015, Errl, Geoff Manning
 * Namespace: errl
 * 
 * Example Configuration:
 *   errl.config = {
 *       developer: 'AwesomeSauft
 *       key: '000000000-0000-0000-0000-000000000000',
 *       product: 'Errl',
 *       environment: null, // optional
 *       version: '1.0.0',
 *       getState: null, // optional
 *       getUser: function () {
 *           return 'geoffrey.floyd';
 *       },
 *       onLogged: function (loggedId) { toastr.success(loggedId); }
 *   }
 * 
 * Usage: window.onerror = function () { errl.log(arguments); }
 * 
 */

(function (exports) {
    'use strict';

	var $ = require('jquery');
	
    var _HTTP = 'http';
    var _HOST_NAME = 'errl.hoomanlogic.com';

    var _browser = (function () {
        var ua = navigator.userAgent, tem,
        M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
        if (/trident/i.test(M[1])) {
            tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
            return 'IE ' + (tem[1] || '');
        }
        if (M[1] === 'Chrome') {
            tem = ua.match(/\bOPR\/(\d+)/)
            if (tem != null) return 'Opera ' + tem[1];
        }
        M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
        if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
        return M.join(' ');
    })();

    // for matching (url:line:char) from stack trace
    // wrote this because IE's url was null
    var _getErrorLocation = function (str) {
        var locationMatch = /\((.*?):(\d+):(\d+)\)/g
        return locationMatch.exec(str);
    };

    var _getState = function () {
        var state = {};

        // pull custom vendor-defined state from config
        if (exports.config.getState) {
            state = exports.config.getState();
        }

        // add helpful state info
        state.browser = exports.browser;
        state.platform = navigator.platform;
        state.cookieEnabled = navigator.cookieEnabled;
        state.language = navigator.language;
        var plugins = Array.prototype.slice.call(navigator.plugins);
        state.plugins = [];
        for (var index = 0; index < plugins.length; index++) {
            state.plugins.push(plugins[index].name);
        }

        return state;
    };

    var _getUser = function () {
        var user = '$anonymous';
        if (exports.config.getUser) {
            user = exports.config.getUser();
        }
        return user;
    };

    exports.getErrorDetailUrl = function (errorId) {
        return _HTTP + '://' + _HOST_NAME + '/errordetail?developer=' + encodeURIComponent(errl.config.developer) + '&product=' + encodeURIComponent(errl.config.product) + '&user=' + encodeURIComponent(errl.config.getUser()) + '&error=' + encodeURIComponent(errorId);

    };

	var _getHost = function () {
		return (exports.config.host || (_HTTP + '://' + _HOST_NAME));
	};
	
    exports.log = function () {

        if (!exports.config) {
            throw new Error('Errl has not been configured');
        }

        if (!arguments[0] || arguments[0].length < 5) {
            throw new Error('Errl log function was passed unexpected number of arguments');
        }

        // build exception object from expected args
        var exception = {
            message: arguments[0][0],      // differs across browsers, avoid using this
                                           // Chrome 39: Uncaught {errorType}: {errorMessage}
                                           // IE 11: {errorMessage}
            url: [0][1],                   // IE had a blank string for url in one test, haven't noticed it since
            lineNumber: arguments[0][2],
            columnNumber: arguments[0][3], // browsers don't share the same convention with column number
                                           // (IE gets the first character in the statement, while Chrome points to the object causing the error)
            error: arguments[0][4]
        };

        var state = _getState();
        var user = _getUser();

        // browser failed to produce location, pull from stack
        if (!exception.url || exception.url.trim() === '') {
            exception.url = _getErrorLocation(exception.error.stack)[1];
        }
    
        var errorType, errorMessage, urlparts, objectName, subName, stack;
        errorType = exception.error.name;
        errorMessage = exception.error.message;
        urlparts = exception.url.split('/');
        objectName = urlparts.slice(3).join('/'); 

        subName = exception.lineNumber;
        stack = exception.error.stack;
 
        //state.clientInfo = window.clientInformation || 'unknown';
        

        $.ajax({
            context: this,
            url: _getHost() + '/api/logerror',
            crossDomain: true,
            dataType: 'json',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                key: exports.config.key,
                productName: exports.config.product,
                environment: exports.config.environment,
                version: exports.config.version,
                errorType: errorType,
                errorDescription: errorMessage,
                objectName: objectName,         // in JS, we use the resource uri for the object name (relative path of js file throwing the error)
                subName: subName,
                details: JSON.stringify(exception),
                stackTrace: stack,
                state: JSON.stringify(state),
                userId: user
            })
        }).done(function (errorId) {
            var error = { errorId: errorId, errorMessage: errorMessage };
            exports.config.onLogged(error);
            errl.latestError = error;
        }).fail(function (jqXHR, textStatus, errorThrown) {
            // the following url structure could give a user the ability to see details on an error (if the account chooses to enable this functionality)
            // http://errl.com/accountName/productName/userId/errorId
            console.error(jqXHR.responseText || textStatus, 'ErrL');
        });
    };

}(typeof exports === 'undefined' ? this['errl'] = {}: exports));
