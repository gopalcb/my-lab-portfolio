const fs=require('fs');
const root=process.cwd();
const {chromium}=require(root+'/../visual-agent-builder/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({path:root+'/../visual-agent-builder/frontend/node_modules/mermaid/dist/mermaid.min.js'});
  const source=fs.readFileSync('public/projects/assets/visual-agent-builder/request-to-result.mmd','utf8');
  const svg=await page.evaluate(async source=>{
   mermaid.initialize({startOnLoad:false,securityLevel:'strict',htmlLabels:false,theme:'base',themeVariables:{fontFamily:'Arial, sans-serif',fontSize:'14px',primaryColor:'#fbfaf7',primaryTextColor:'#26322f',primaryBorderColor:'#8da699',lineColor:'#5b7568',edgeLabelBackground:'#f5f4ef',background:'#f5f4ef'},flowchart:{htmlLabels:false,curve:'basis',nodeSpacing:24,rankSpacing:28,wrappingWidth:340,padding:12,useMaxWidth:true}});
   return (await mermaid.render('runtime-controller-flow',source)).svg;
  },source);
  if(/<script|<foreignObject/i.test(svg))throw Error('SVG must be script-free and use SVG text');
  fs.writeFileSync('public/projects/assets/visual-agent-builder/request-to-result.svg',svg);
  console.log('Rendered Mermaid SVG with local installed Mermaid; no runtime script needed.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
