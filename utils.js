const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

/**
 * @description 文件更新日期
*/
const getFileUpdateDate = (path) => {
  const stat = fs.statSync(path);
  return stat.mtime.toUTCString();
};

/**
 * @description 判断资源是否继续使用缓存
 */
const ifUseCache = (ctx, url, ifNoneMatch, ifModifiedSince) => {
  let flag = false;
  // 协商缓存
  ctx.set("cache-control", "no-cache");
  // 设置过期时间30s
  //   console.log(new Date(Date.now() + 30000));
  ctx.set("Expires", new Date(Date.now() + 30000).toUTCString());
  //   console.log('hello!!!');
  let filePath = url.includes(".vue") ? url : path.join(__dirname, url);
  if (url === "/") {
    filePath = path.join(__dirname, "./index.html");
  }
  let LastModifiedTime = getFileUpdateDate(filePath);

  // hash 获取etag
  const buffer = fs.readFileSync(filePath, "utf-8");
  const hash = crypto.createHash("md5");
  hash.update(buffer, "utf-8");
  const etag = `${hash.digest("hex")}`;
  if (ifNoneMatch === etag) {
    ctx.status = 304;
    ctx.body = "";
    flag = true;
  } else {
    ctx.set("etag", etag);
    flag = false;
  }

  if (!ifNoneMatch && ifModifiedSince === LastModifiedTime) {
    ctx.status = 304;
    ctx.body = "";
    flag = true;
  } else {
    ctx.set("Last-Modified", LastModifiedTime);
    flag = false;
  }

  return flag;
};

/**
 * @description 裸模块替换,解决import文件依赖的路径问题
 *              例如, import {createApp} from 'vue'时, 不进行处理,
 *              客户端直接解析这段代码, 服务端方法请求时, 服务端无法正确相应
 */
const rewiriteImport = (content) => {
  // 使用正则, 把依赖路径提前出来
  return content.replace(/ from ['"](.*)['"]/g, (s1, s2) => {
    if (s2.startsWith("/") || s2.startsWith("./") || s2.startsWith("../")) {
      return s1;
    } else {
      return `from "/@modules/${s2}"`;
    }
  });
};

module.exports = {
  ifUseCache,
  rewiriteImport,
};
