# Nodejs Client for FastDFS

[FastDFS](http://bbs.chinaunix.net/forum-240-1.html) �ǹ��˿����ķֲ�ʽ��С�ļ��洢ϵͳ�������Ŀ��FastDFS��nodejs�ͻ��ˣ�������FastDFS Server���н����������ļ�����ز������Ҳ��Թ���server�汾��4.0.6��
���[co](https://github.com/visionmedia/co)ʹ�ã�������[co-fdfs-client](https://github.com/chenboxiang/co-fdfs-client)��

# ��װ
```shell
npm install fdfs-client
```

# ʹ��
```javascript
var fdfs = new FdfsClient({
    // tracker servers
    trackers: [
        {
            host: 'tracker.fastdfs.com',
            port: 22122
        }
    ],
    // Ĭ�ϳ�ʱʱ��10s
    timeout: 10000,
    // Ĭ�Ϻ�׺
    // ����ȡ�����ļ���׺ʱʹ��
    defaultExt: 'txt',
    // charsetĬ��utf8
    charset: 'utf8'
})
```
������һЩ�������ã��㻹�����Զ��������־������ߣ�Ĭ����ʹ��console
������Ҫʹ��[debug](https://github.com/visionmedia/debug)��Ϊ�����־������ߣ��������ô����
```javascript
var debug = require('debug')('fdfs')
var fdfs = new FdfsClient({
    // tracker servers
    trackers: [
        {
            host: 'tracker.fastdfs.com',
            port: 22122
        }
    ],
    logger: {
        log: debug
    }
})
```

### �ϴ��ļ�
ע������fileIdΪgroup + '/' + filename�����µ����в���ʹ�õ�fileId����һ��

ͨ�������ļ����ϴ�
```javascript
fdfs.upload('test.gif', function(err, fileId) {
    // fileId Ϊ group + '/' + filename
})
```

�ϴ�Buffer
```javascript
var fs = require('fs')
// ע��˴���buffer��ȡ��ʽֻΪ��ʾ���ܣ�ʵ�ʲ�����ôȥ����buffer
var buffer = fs.readFileSync('test.gif')
fdfs.upload(buffer, function(err, fileId) {
    
})
```

ReadableStream
```javascript
var fs = require('fs')
var rs = fs.createReadStream('test.gif')
fdfs.upload(rs, function(err, fileId) {
    
})
```

����һЩoptions����Ϊ��2����������
```js
fdfs.upload('test.gif', {
    // ָ���ļ��洢��group����ָ������tracker server����
    group: 'group1',
    // file bytes, file����ΪReadableStreamʱ����ָ��
    size: 1024,
    // �ϴ��ļ��ĺ�׺����ָ�����ȡfile�����ĺ�׺������(.)
    ext: 'jpg'
    
}, function(err, fileId) {

})
```

### �����ļ�

���ص�����
```js
fdfs.download(fileId, 'test_download.gif', function(err) {
    
})
```

���ص�WritableStream
```js
var fs = require('fs')
var ws = fs.createWritableStream('test_download.gif')
fdfs.download(fileId, ws, function(err) {

})

```

�����ļ�Ƭ��
```js
fdfs.download(fileId, {
    target: 'test_download.part',
    offset: 5,
    bytes: 5
}, function(err) {

})
```

### ɾ���ļ�

```js
fdfs.del(fileId, function(err) {

})
```

### ��ȡ�ļ���Ϣ

```js
fdfs.getFileInfo(fileId, function(err, fileInfo) {
    // fileInfo��4������
    // {
    //   // �ļ���С
    //   size:
    //   // �ļ�������ʱ�������λΪ��
    //   timestamp:
    //   // У���
    //   crc32:
    //   // ����ϴ�����storage server��ip
    //   addr:
    // }
    console.log(fileInfo)
})
```

### �ļ���Meta Data

����Meta Data, ��ֻ�������ļ�ǩ����Ϣ�ɣ�flag�ֶ����������Ĭ����O
```js
/**
 * @param fileId
 * @param metaData  {key1: value1, key2: value2}
 * @param flag 'O' for overwrite all old metadata (default)
                'M' for merge, insert when the meta item not exist, otherwise update it
 * @param callback
 */
fdfs.setMetaData(fileId, metaData, flag, callback)
```

��ȡMeta Data
```js
fdfs.getMetaData(fileId, function(err, metaData) {
    console.log(metaData)
})
```


### ������

����tracker����ʱ�ᴥ��error�¼�
```javascript
fdfs.on('error', function(err) {
    // �����ﴦ�����
})
```

# ����
����ʱ��Ҫ�õ�co��������Ҫnode�汾0.11+������ǰ��ȷ�����ú�FastDFS��Server��ַ��Ϊtracker.fastdfs.com:22122�������޸�test/fdfs_test.js�е�client���ã�Ȼ��ִ���������
```shell
make test
```

# ����
���κ��������ύ��Github Issue��

# ��ȨЭ��
MIT