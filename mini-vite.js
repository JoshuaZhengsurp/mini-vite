const Koa = require("koa");
const path = require("path");
const fs = require("fs");
const compilerSfc = require("@vue/compiler-sfc");
const compilerDom = require("@vue/compiler-dom");

const utils = require("./utils.js");

const app = new Koa();

const { rewiriteImport, ifUseCache } = utils;

app.use((ctx) => {
  const { url, query } = ctx.request;
  const { "if-none-match": ifNoneMatch, "if-modified-since": ifModifiedSince } =
    ctx.request.headers;

  const html = fs.readFileSync("./index.html", "utf-8");

  // 通过url 返回不同的资源路径
  if (url === "/") {
    ctx.type = "text/html";
    ctx.body = html;
  } 
  else if (url.endsWith(".js")) {
    ctx.set("cache-control", "no-catch"); // 入口js, 走协商缓存
    const used = ifUseCache(ctx, url, ifNoneMatch, ifModifiedSince);
    if (used) {
      ctx.status = 304;
      ctx.body = null;
      return;
    }
    const filePath = path.join(__dirname, url);
    const file = fs.readFileSync(filePath, "utf-8");
    ctx.type = "application/javascript";
    ctx.body = rewiriteImport(file);
  } 
  else if (url.startsWith("/@modules/")) {
    ctx.set("cache-control", "max-age=31536000, immutable"); // 依赖, 走强缓存
    ctx.type = "application/javascript";
    // 用"node_modules"替换/@modules/, 获取对应模块的模块文件路径
    const filePrefix = path.resolve(
      __dirname,
      "node_modules",
      url.replace("/@modules/", "")
    );
    const module = require(filePrefix + "/package.json").module;
    const file = fs.readFileSync(filePrefix + "/" + module, "utf-8");
    ctx.body = rewiriteImport(file);
  } 
  else if (url.includes(".vue")) {
    const filePath = path.resolve(__dirname, url.slice(1).split("?")[0]);

    const used = ifUseCache(ctx, filePath, ifNoneMatch, ifModifiedSince);
    if (used) {
      ctx.status = 304;
      ctx.body = null;
      return;
    }

    const { descriptor } = compilerSfc.parse(
      fs.readFileSync(filePath, "utf-8")
    );
    if (!query.type) {
      const scriptContent =
        descriptor.script?.content || descriptor.scriptSetup?.content;
      const script = scriptContent.replace(
        "export default",
        "const __script ="
      );
      ctx.type = "text/javascript";
      ctx.body = `
        ${rewiriteImport(script)}
        ${descriptor.styles.length ? `import "${url}?type=style"` : ""}
        import {render as __render} from '${url}?type=template'
        __script.render = __render
        export default __script
      `;
    } else if (query.type === "template") {
      const templateContent = descriptor.template.content;
      const render = compilerDom.compile(templateContent, {
        mode: "module",
      }).code;
      ctx.type = "application/javascript";
      ctx.body = rewiriteImport(render);
    } else if (query.type === "style") {
      const styleBlock = descriptor.styles[0];
      ctx.type = "application/javascript";
      ctx.body = `
        const css = ${JSON.stringify(styleBlock.content)}
        updateStyle(css)
        export default css
      `;
    }
  }
});

app.listen(3000, function () {
  console.log("start mini-vite");
});
