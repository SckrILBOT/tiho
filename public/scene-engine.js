/* Shared 3D window assembly and independently travelling painted tree sprites. */
(() => {
  const canvas = document.querySelector('.scene-landscape');
  const context = canvas.getContext('2d', {alpha:false});
  const windowUnit = new window.TihoWindowUnit(document.querySelector('.window-unit'));
  const mountingPath=window.TihoWindowUnit.mountingPath;
  document.querySelector('#exterior-mask > path:last-child').setAttribute('d',mountingPath);
  document.querySelector('#unit-mount-mask > path').setAttribute('d',mountingPath);
  document.querySelector('.transom-static-fallback').style.display='none';
  const background = new Image();
  const trees = new Image();
  canvas.style.visibility='hidden';
  background.src = './assets/forest-panorama.webp';
  trees.src = './assets/trees-atlas.webp';
  const width = canvas.width;
  const height = canvas.height;
  const distantPlate=document.createElement('canvas');
  distantPlate.width=width;
  distantPlate.height=height;
  const distantContext=distantPlate.getContext('2d');
  let loaded = false;
  let running = false;
  let frame = 0;
  let previous = 0;
  let seed = 17290821;
  let totalTravel = 0;
  let spawned = 0;
  let angle = 0;
  let turn = null;

  function random() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const layers = [
    {speed:26,alpha:.35,min:240,max:390,gap:35,count:12,base:735,items:[]},
    {speed:115,alpha:.64,min:360,max:560,gap:85,count:9,base:800,items:[]},
    {speed:420,alpha:.94,min:480,max:750,gap:190,count:5,base:875,items:[]}
  ];
  function makeTree(layer,x) {
    const h = layer.min + random() * (layer.max-layer.min);
    return {x,height:h,width:h*(.48+random()*.28),sprite:Math.floor(random()*4),flip:random()>.5,base:layer.base+random()*35};
  }
  for(const layer of layers) {
    let x = -250;
    for(let i=0;i<layer.count;i++) {
      const tree=makeTree(layer,x);
      layer.items.push(tree);
      x += tree.width*.6 + layer.gap*(.6+random());
    }
  }

  function drawForest() {
    if(!context) return;
    context.globalAlpha=1;
    context.fillStyle='#0a2032';
    context.fillRect(0,0,width,height);
    if(!loaded) return;
    // A fixed, distant painting is never swapped or dissolved.
    context.drawImage(distantPlate,0,0);
    const cellWidth=trees.naturalWidth/4;
    for(const layer of layers) {
      context.globalAlpha=layer.alpha;
      for(const tree of layer.items) {
        if(tree.x>width || tree.x+tree.width<0) continue;
        context.save();
        context.translate(tree.x+(tree.flip?tree.width:0),tree.base-tree.height);
        context.scale(tree.flip?-1:1,1);
        context.drawImage(trees,tree.sprite*cellWidth,0,cellWidth,trees.naturalHeight,0,0,tree.width,tree.height);
        context.restore();
      }
    }
    context.globalAlpha=1;
  }

  function advanceForest(dt) {
    totalTravel += layers[2].speed*dt;
    for(const layer of layers) {
      for(const tree of layer.items) tree.x -= layer.speed*dt;
      for(let i=0;i<layer.items.length;i++) {
        if(layer.items[i].x+layer.items[i].width < -50) {
          const last=Math.max(...layer.items.map(tree=>tree.x+tree.width*.65));
          layer.items[i]=makeTree(layer,Math.max(width+50,last+layer.gap*(.6+random())));
          spawned++;
        }
      }
    }
  }

  function drawSash() {
    windowUnit.render(angle);
  }
  function tick(now) {
    frame=0;
    const dt=previous?Math.min(.045,(now-previous)/1000):0;
    previous=now;
    if(running && loaded) {advanceForest(dt);drawForest();}
    if(turn) {
      const progress=Math.min(1,(now-turn.start)/620);
      const eased=.5-Math.cos(progress*Math.PI)/2;
      angle=turn.from+(turn.to-turn.from)*eased;
      drawSash();
      if(progress===1) turn=null;
    }
    if(running || turn) frame=requestAnimationFrame(tick);
    else previous=0;
  }
  function schedule() {if(!frame) {previous=0;frame=requestAnimationFrame(tick);}}
  window.tihoSceneEngine={
    setRunning(value) {running=value;if(running) schedule();},
    setWindow(open,immediate=false) {
      if(immediate) {turn=null;angle=open?42:0;drawSash();}
      else {turn={from:angle,to:open?42:0,start:performance.now()};schedule();}
    },
    snapshot() {return {running,loaded,angle,spawned,totalTravel,speeds:layers.map(layer=>layer.speed),...windowUnit.snapshot()};}
  };
  drawSash();
  drawForest();
  Promise.all([background.decode(),trees.decode()]).then(()=>{
    distantContext.fillStyle='#0a2032';
    distantContext.fillRect(0,0,width,height);
    distantContext.filter='blur(1px)';
    distantContext.drawImage(background,0,25,2550,850);
    loaded=true;
    drawForest();
    canvas.style.visibility='visible';
    canvas.dataset.ready='true';
  }).catch(()=>{canvas.style.visibility='hidden';});
})();
