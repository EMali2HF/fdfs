/**
 * Created by yang on 2015/8/25.
 */
'use strict';

var path = require('path');
var fs = require('fs');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var is = require('is-type-of');
var Tracker = require('./tracker.js');
var logger = require('./logger.js');
var helpers = require('./helpers.js');
var protocol = require('./protocol.js');


var defaults = {
    charset: 'utf8',
    trackers: [],
    // Ĭ�ϳ�ʱʱ��10s
    timeout: 10000,
    // Ĭ�Ϻ�׺
    // ����ȡ�����ļ���׺ʱʹ��
    defaultExt: 'txt'
};

function FdfsClient(config) {
    EventEmitter.call(this);
    // config global logger
    if (config && config.logger) {
        logger.setLogger(config.logger);
    }
    this.config = _.extend({}, defaults, config);

    this._checkConfig();
    this._init();
    this._errorHandle();
}

// extends from EventEmitter
util.inherits(FdfsClient, EventEmitter);

// ------------- private methods
/**
 * ȷ�������Ƿ�Ϸ�
 * @private
 */
FdfsClient.prototype._checkConfig = function() {

    // ------------- ��֤trackers�Ƿ�Ϸ�
    if (!this.config.trackers) {
        throw new Error('you must specify "trackers" in config.');
    }

    if (!Array.isArray(this.config.trackers)) {
        this.config.trackers = [this.config.trackers];
    }

    if (this.config.trackers.length === 0) {
        throw new Error('"trackers" in config is empty.');
    }

    this.config.trackers.forEach(function(tracker) {
        if (!tracker.host || !tracker.port) {
            throw new Error('"trackers" in config is invalid, every tracker must all have "host" and "port".');
        }
    });
};

FdfsClient.prototype._init = function() {
    // --------- init trackers
    var self = this;
    this._trackers = [];
    this.config.trackers.forEach(function(tc) {
        tc.timeout = self.config.timeout;
        tc.charset = self.config.charset;
        var tracker = new Tracker(tc) ;
        self._trackers.push(tracker);
        tracker.on('error', function(err) {
            logger.error(err);
            // ���д����tracker�޳�
            self._trackers.splice(self._trackers.indexOf(tracker), 1);
            // ����Ƿ��п��õ�tracker
            if (self._trackers.length === 0) {
                self.emit('error', new Error('There are no available trackers, please check your tracker config or your tracker server.'));
            }
        });
    });
};

FdfsClient.prototype._errorHandle = function() {
    // 1. ��û��tracker����ʱ����
    // 2. ������storage����ʱ����
    this.on('error', function(err) {
        logger.error(err);
    });
};

/**
 * ��˳���ȡ���õ�tracker
 * @private
 */
FdfsClient.prototype._getTracker = function() {
    if (null == this._trackerIndex) {
        this._trackerIndex = 0;
        return this._trackers[0];

    } else {
        this._trackerIndex++;
        if (this._trackerIndex >= this._trackers.length) {
            this._trackerIndex = 0;
        }
        return this._trackers[this._trackerIndex];
    }
};

FdfsClient.prototype._upload = function(file, options, callback) {
    var tracker = this._getTracker();

    tracker.getStoreStorage(options.group, function(err, storage) {
        if (null != err) {
            callback(err);
            return;
        }
        storage.upload(file, options, callback);
    })
};

// ------------- public methods

/**
 * �ϴ��ļ�
 * @param file absolute file path or Buffer or ReadableStream
 * @param options
 *      options.group: ָ��Ҫ�ϴ���group, ��ָ������tracker server����
 *      options.size: file size, file����ΪReadableStreamʱ����ָ��
 *      options.ext: �ϴ��ļ��ĺ�׺����ָ�����ȡfile�����ĺ�׺������(.)
 * @param callback
 */
FdfsClient.prototype.upload = function(file, options, callback) {
    var self = this;
    if (is.function(options)) {
        callback = options;
        options = {};

    } else {
        if (!options) {
            options = {};
        }
    }

    _normalizeUploadParams(file, options, function(err) {
        if (err) {
            callback(err);
            return;
        }
        if (!options.ext) {
            options.ext = self.defaultExt;
        }

        if (!options.group && options.fileId) {
            var gf = helpers.id2gf(options.fileId);
            options.group = gf.group;
        }

        self._upload(file, options, callback);
    });
};

/**
 * �����ļ�
 * @param fileId
 * @param options options����ֱ�Ӵ�options.target
 *      options.target ���ص��ļ�������д�뵽��������Ǳ����ļ�����Ҳ������WritableStream�����Ϊ����ÿ�η������������ݵ�ʱ�򶼻�ص�callback
 *      options.offset��options.bytes: ��ֻ�������ļ��е�ĳ1Ƭ��ʱָ��
 * @param callback ��δָ��options.target��������ÿ�����ݵķ��ض���ص�����ָ����options.target����ֻ�ڽ���ʱ�ص�һ��
 */
FdfsClient.prototype.download = function(fileId, options, callback) {
    if (!options || is.function(options)) {
        callback(new Error('options.target is not specified'));
        return;
    }

    // ֱ�Ӵ���target
    if (!options.target) {
        var ori = options;
        options = {};
        options.target = ori;
    }

    if (!(is.string(options.target) || is.writableStream(options.target))) {
        callback(new Error('options.target is invalid, it\'s type must be String or WritableStream'));
    }

    if (is.string(options.target)) {
        options.target = fs.createWriteStream(options.target);
    }

    this._getTracker().getFetchStorage(fileId, function(err, storage) {
        storage.download(fileId, options, callback);
    });
};

/**
 * ɾ��fileIdָ�����ļ�
 * @param fileId
 * @param callback
 */
FdfsClient.prototype.del = function(fileId, callback) {
    this._getTracker().getUpdateStorage(fileId, function(err, storage) {
        if (null != err) {
            callback(err);
            return;
        }
        storage.del(fileId, callback);
    });
};
FdfsClient.prototype.remove = FdfsClient.prototype.del;

/**
 * @param fileId
 * @param metaData  {key1: value1, key2: value2}
 * @param flag 'O' for overwrite all old metadata (default)
 'M' for merge, insert when the meta item not exist, otherwise update it
 * @param callback
 */
FdfsClient.prototype.setMetaData = function(fileId, metaData, flag, callback) {
    if (is.function(flag)) {
        callback = flag;
        flag = 'O';
    }

    this._getTracker().getUpdateStorage(fileId, function(err, storage) {
        if (null != err) {
            callback(err);
            return;
        }
        storage.setMetaData(fileId, metaData, flag, callback);
    });
};

/**
 * ��ȡָ��fileId��meta data
 * @param fileId
 * @param callback
 */
FdfsClient.prototype.getMetaData = function(fileId, callback) {
    this._getTracker().getUpdateStorage(fileId, function(err, storage) {
        if (null != err) {
            callback(err);
            return;
        }
        storage.getMetaData(fileId, callback);
    });
};

/**
 * ��ȡָ��fileId����Ϣ
 * fileInfo�ᴫ���ص����ṹ����
 *  {
 *      // �ļ���С
 *      size:
 *      // �ļ�������UTCʱ�������λΪ��
 *      timestamp:
 *      crc32:
 *      // ����ϴ�����storage server��ip
 *      addr:
 *  }
 * @param fileId
 * @param callback
 */
FdfsClient.prototype.getFileInfo = function(fileId, callback) {
    this._getTracker().getUpdateStorage(fileId, function(err, storage) {
        if (err) {
            callback(err);
            return;
        }
        storage.getFileInfo(fileId, callback);
    });
};

// -------------- helpers
/**
 * ��֤file�����Ƿ�Ϸ���ͬʱ����һЩ��Ҫ�Ĳ���
 * ��ΪString��������֤�Ƿ����
 * ��ΪReadableStream��������֤options.size�Ƿ����
 * @param file
 * @param options
 * @param callback
 * @private
 */
function _normalizeUploadParams(file, options, callback) {
    if (!file) {
        callback(new Error('The "file" parameter is empty.'));
        return;
    }

    if (!(is.string(file) || is.buffer(file) || is.readableStream(file))) {
        callback(new Error('The "file" parameter is invalid, it must be a String, Buffer, or ReadableStream'));
        return;
    }

    if (is.string(file)) {
        fs.stat(file, function(err, stats) {
            if (err || !stats) {
                callback(new Error('File [' + file + '] is not exists!'));
                return;
            }

            options.size = stats.size;
            if (!options.ext) {
                options.ext = path.extname(file);
                if (options.ext) {
                    // ȥ��.
                    options.ext = options.ext.substring(1);
                }
            }
            callback(null);
        });
        return;
    }

    if (is.readableStream(file) && !options.size) {
        callback(new Error('when the "file" parameter\'s is ReadableStream, options.size must specified'));
        return;
    }

    if (is.buffer(file)) {
        options.size = file.length;
    }

    if (options.method === protocol.FDFS_METHOD_UPLOAD_APPENDER_FILE) {

    } else if (options.method === protocol.FDFS_METHOD_APPEND_FILE) {

    } else if (options.method === protocol.FDFS_METHOD_MODIFY_FILE) {

    }

    callback(null);
};


//exports
module.exports = FdfsClient;