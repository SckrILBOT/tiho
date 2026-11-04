/* One 3D assembly: fixed frame, rebate, seal, hinged sash, glass and fittings.
   All pieces share millimetre-like model coordinates and a single camera. */
(() => {
  const W=760,H=146,F=14,GAP=.65,SASH=8;
  const opening={left:F,top:F,right:W-F,bottom:H-F};
  const sash={left:F+GAP,top:F+GAP,right:W-F-GAP,bottom:H-F-GAP};
  const hingeY=sash.bottom,hingeZ=2;
  const rectangle=[[0,0],[W,0],[W,H],[0,H]];
  const mountingQuad=[[568,-100],[1280,150],[1272,262],[568,70]];

  function homography(from,to) {
    const rows=[];
    from.forEach(([x,y],i)=>{
      const [u,v]=to[i];
      rows.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);
    });
    for(let c=0;c<8;c++) {
      let pivot=c;
      for(let r=c+1;r<8;r++) if(Math.abs(rows[r][c])>Math.abs(rows[pivot][c])) pivot=r;
      [rows[c],rows[pivot]]=[rows[pivot],rows[c]];
      const scale=rows[c][c];
      for(let j=c;j<9;j++) rows[c][j]/=scale;
      for(let r=0;r<8;r++) {
        if(r===c) continue;
        const factor=rows[r][c];
        for(let j=c;j<9;j++) rows[r][j]-=factor*rows[c][j];
      }
    }
    return rows.map(row=>row[8]);
  }
  const camera=homography(rectangle,mountingQuad);
  function project([x,y,z]) {
    const perspective=1-z/1100;
    x=380+(x-380)/perspective;
    y=hingeY+(y-hingeY)/perspective;
    const w=camera[6]*x+camera[7]*y+1;
    return [(camera[0]*x+camera[1]*y+camera[2])/w,(camera[3]*x+camera[4]*y+camera[5])/w];
  }
  function rotate([x,y,z],angle) {
    const c=Math.cos(angle),s=Math.sin(angle),dy=y-hingeY,dz=z-hingeZ;
    return [x,hingeY+dy*c+dz*s,hingeZ-dy*s+dz*c];
  }
  const faces=[];
  function face(points,color,moving=false,texture=false) {faces.push({points,color,moving,texture});}
  function box(x0,y0,x1,y1,back,front,color,moving=false) {
    const p=[[x0,y0,back],[x1,y0,back],[x1,y1,back],[x0,y1,back],[x0,y0,front],[x1,y0,front],[x1,y1,front],[x0,y1,front]];
    face([p[0],p[1],p[2],p[3]],'#111b23',moving);
    face([p[0],p[4],p[5],p[1]],'#596069',moving);
    face([p[1],p[5],p[6],p[2]],'#1a232b',moving);
    face([p[2],p[6],p[7],p[3]],'#151e25',moving);
    face([p[3],p[7],p[4],p[0]],'#3e4850',moving);
    face([p[4],p[5],p[6],p[7]],color,moving,x1-x0>=y1-y0?'rail':'upright');
  }
  function ring(bounds,thickness,back,front,color,moving=false) {
    const {left:l,top:t,right:r,bottom:b}=bounds;
    box(l,t,r,t+thickness,back,front,color,moving);
    box(l,b-thickness,r,b,back,front,color,moving);
    box(l,t+thickness,l+thickness,b-thickness,back,front,color,moving);
    box(r-thickness,t+thickness,r,b-thickness,back,front,color,moving);
  }
  // The mounting lip replaces the painted edge rather than sitting inside it.
  ring({left:-3,top:-3,right:W+3,bottom:H+3},6,-15,-2,'#292d30');
  ring({left:0,top:0,right:W,bottom:H},F,-14,1,'#30383f');
  ring({left:F-2,top:F-2,right:W-F+2,bottom:H-F+2},3,-10,-4,'#111d27');
  // Rubber rebate continues underneath the .65-unit assembly clearance.
  ring({left:F-.5,top:F-.5,right:W-F+.5,bottom:H-F+.5},3,-3,-1.4,'#101b24');
  ring(sash,SASH,-6,-1,'#3c4246',true);
  const glass={left:sash.left+SASH,top:sash.top+SASH,right:sash.right-SASH,bottom:sash.bottom-SASH};
  face([[glass.left,glass.top,-2],[glass.right,glass.top,-2],[glass.right,glass.bottom,-2],[glass.left,glass.bottom,-2]],'rgba(115,149,176,.025)',true);
  // Latch is attached to the lower sash rail; hinges belong to the same axis.
  box(355,sash.bottom-8,405,sash.bottom-2,-1,3,'#82735a',true);
  box(369,sash.bottom-7,391,sash.bottom-3,3,5,'#a18c67',true);
  for(const x of [F+42,W-F-42]) {
    box(x-12,hingeY-3,x+12,hingeY+3,-7,2,'#716b58');
  }

  function polygon(context,points) {
    context.beginPath();context.moveTo(...points[0]);
    for(const point of points.slice(1)) context.lineTo(...point);
    context.closePath();
  }
  function textureTriangle(context,image,source,dest) {
    const [[x0,y0],[x1,y1],[x2,y2]]=source;
    const [[u0,v0],[u1,v1],[u2,v2]]=dest;
    const det=x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1);
    if(Math.abs(det)<.00001) return;
    const a=(u0*(y1-y2)+u1*(y2-y0)+u2*(y0-y1))/det;
    const c=(u0*(x2-x1)+u1*(x0-x2)+u2*(x1-x0))/det;
    const e=(u0*(x1*y2-x2*y1)+u1*(x2*y0-x0*y2)+u2*(x0*y1-x1*y0))/det;
    const b=(v0*(y1-y2)+v1*(y2-y0)+v2*(y0-y1))/det;
    const d=(v0*(x2-x1)+v1*(x0-x2)+v2*(x1-x0))/det;
    const f=(v0*(x1*y2-x2*y1)+v1*(x2*y0-x0*y2)+v2*(x0*y1-x1*y0))/det;
    context.save();polygon(context,dest);context.clip();context.transform(a,b,c,d,e,f);context.drawImage(image,0,0);context.restore();
  }

  window.TihoWindowUnit=class {
    static get mountingPath() {return mountingQuad.map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join(' ')+' Z';}
    constructor(canvas) {
      this.canvas=canvas;this.context=canvas.getContext('2d');this.angle=0;
      this.texture=new Image();this.texture.src='./assets/compartment.webp';
      this.texture.decode().then(()=>this.render(this.angle)).catch(()=>{});
      this.render(0);
    }
    render(degrees) {
      this.angle=degrees;
      const context=this.context;
      const scale=this.canvas.width/1000;
      context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,this.canvas.width,this.canvas.height);
      context.setTransform(scale,0,0,scale,-440*scale,120*scale);
      const radians=degrees*Math.PI/180;
      const sorted=faces.map(item=>{
        const points=item.points.map(point=>item.moving?rotate(point,radians):point);
        return {...item,world:points,screen:points.map(project),depth:points.reduce((sum,p)=>sum+p[2],0)/points.length};
      }).sort((a,b)=>a.depth-b.depth);
      for(const item of sorted) {
        polygon(context,item.screen);context.fillStyle=item.color;context.fill();
        if(item.texture && this.texture.complete && this.texture.naturalWidth && item.color!=='#101b24') {
          // Sample the original painted rail so grain, wear and lighting match
          // the fixed lower window. The geometry still controls the opening.
          const rail=[[612,39],[962,133],[958,151],[608,57]];
          const uv=item.texture==='upright'?[rail[0],rail[3],rail[2],rail[1]]:rail;
          context.save();context.globalAlpha=.94;
          textureTriangle(context,this.texture,[uv[0],uv[1],uv[2]],[item.screen[0],item.screen[1],item.screen[2]]);
          textureTriangle(context,this.texture,[uv[0],uv[2],uv[3]],[item.screen[0],item.screen[2],item.screen[3]]);
          context.restore();
        }
      }
    }
    snapshot() {
      const radians=this.angle*Math.PI/180;
      const corners=[[sash.left,sash.top,-1],[sash.right,sash.top,-1],[sash.right,sash.bottom,-1],[sash.left,sash.bottom,-1]].map(p=>project(rotate(p,radians)));
      return {
        angle:this.angle,corners,
        hinges:[project([F+42,hingeY,hingeZ]),project([W-F-42,hingeY,hingeZ])],
        clearance:GAP,sealOverlap:3-GAP,faceCount:faces.length,
        frameBounds:opening,sashBounds:sash,
        sealSamples:[[F+GAP/2,H/2,-1.4],[W-F-GAP/2,H/2,-1.4],[W/2,F+GAP/2,-1.4],[W/2,H-F-GAP/2,-1.4]].map(point=>{
          const screen=project(point);
          const x=Math.round((screen[0]-440)*this.canvas.width/1000);
          const y=Math.round((screen[1]+120)*this.canvas.width/1000);
          // file:// may taint a textured canvas; diagnostics must not break the scene.
          try { return {screen,rgba:[...this.context.getImageData(x,y,1,1).data]}; }
          catch { return {screen,rgba:null,unavailable:'canvas pixel access restricted'}; }
        }),
        assembly:'shared-3d-frame-rebate-sash-glass'
      };
    }
  };
})();
