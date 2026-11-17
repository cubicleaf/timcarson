/* Bio section: the dot matrix carries into the cream, and Tim's photo dissolves into it.
   One canvas behind the About text. Burgundy matrix dots on cream, driven by the same kind of
   plane-wave field as the dark ambiance; the photo's edge is a continuous halftone (holes open
   in the solid image, become a checkerboard, then dots), so there is no outline anywhere.
   Decorative only: aria-hidden, no pointer events, off under reduced motion (one still frame).
   If the images fail to load, the original portrait stays as it was. */
(function(){
  'use strict';
  var sec=document.getElementById('about');
  if(!sec) return;
  var REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var D=19, BURG=[74,21,37], CREAM_LO=[201,184,166];
  var EXP=0.5+0.60*2.0, R_PEAK=6.5;
  var clamp=function(v,a,b){a=a===undefined?0:a;b=b===undefined?1:b;return Math.max(a,Math.min(b,v));};
  var smooth=function(a,b,v){var t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
  var lerp3=function(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];};

  /* ---- wave field (plane waves, as the site's ambiance) ---- */
  function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  var R=mulberry(20261111), rand=function(a,b){return a+R()*(b-a);};
  var WAVES=[],AMP=0;
  for(var i=0;i<8;i++){var angle=rand(0,Math.PI*2),wl=rand(180,720);
    WAVES.push({k:Math.PI*2/wl,omega:(38*(Math.PI*2/wl))*rand(.55,1.9)*(R()<.5?-1:1),phase:rand(0,Math.PI*2),amp:rand(.5,1.4),angVel:rand(-.025,.025),angle:angle});}
  WAVES.forEach(function(w){AMP+=w.amp;});
  function field(x,y,t){var m=0;for(var i=0;i<WAVES.length;i++){var w=WAVES[i];m+=Math.sin(w.k*(Math.cos(w.angle)*x+Math.sin(w.angle)*y)+w.omega*t+w.phase)*w.amp;}return m/AMP;}
  function driftWaves(dt){for(var i=0;i<WAVES.length;i++)WAVES[i].angle+=WAVES[i].angVel*dt;}
  var FE=function(x,y,t){return clamp(2.4*field(x,y,t),-1,1);};
  var mag=function(v){return Math.pow(clamp((clamp(v,-1,1)+1)*.5),EXP);};

  /* ---- halftone spot function, peaks at every matrix dot; THR maps coverage to a threshold ---- */
  var zone=function(x,y,x0,x1,y0,y1){var f=6;return smooth(x0-f,x0,x)*(1-smooth(x1,x1+f,x))*smooth(y0-f,y0,y)*(1-smooth(y1,y1+f,y));};
  var FQ=function(x,y){return (Math.cos(2*Math.PI*(x-5)/D)+Math.cos(2*Math.PI*(y-5)/D))/2;};
  var THR=(function(){var a=[];for(var i=0;i<96;i++)for(var j=0;j<96;j++)a.push(FQ(5+i*D/96,5+j*D/96));a.sort(function(x,y){return x-y;});
    var out=new Float32Array(256);for(var k=0;k<256;k++)out[k]=a[Math.min(a.length-1,Math.floor((1-k/255)*(a.length-1)))];return out;})();

  /* ---- pebble contour in unit space (0..1) ---- */
  var SEG=[[.5,.02],[[.74,0],[.97,.15],[.98,.40]],[[1.0,.67],[.90,.97],[.62,.98]],[[.36,1.0],[.04,.92],[.02,.60]],[[0,.33],[.22,.04],[.5,.02]]];
  var UNIT=[];(function(){var p0=SEG[0];for(var s=1;s<SEG.length;s++){var c1=SEG[s][0],c2=SEG[s][1],p3=SEG[s][2];
    for(var i=0;i<40;i++){var t=i/40,u=1-t;UNIT.push([u*u*u*p0[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*p3[1]]);}p0=p3;}})();
  var N=UNIT.length;

  var imgB=new Image(), imgS=new Image(), loaded=0, failed=false;
  var ST=null, running=false, visible=false, T=3, last=0, raf=0, canvas=null, ctx=null, built=false;

  function ready(){if(++loaded===2) init();}
  imgB.onload=ready; imgS.onload=ready;
  imgB.onerror=imgS.onerror=function(){failed=true;};
  imgB.src='assets/bio-backdrop.jpg'; imgS.src='assets/bio-subject.png';

  function init(){
    if(failed) return;
    var st=document.createElement('style');
    st.textContent='#about{position:relative}#about>.wrap{position:relative;z-index:2}'+
      '#about .bio-edge{position:absolute;left:0;top:0;z-index:1;pointer-events:none;opacity:0;transition:opacity 1.2s cubic-bezier(.25,.1,.25,1)}'+
      '#about .bio-edge.on{opacity:1}'+
      '#about.cc-bio-on .portrait-img,#about.cc-bio-on .portrait{opacity:0!important}'+
      '@media(min-width:761px){#about.cc-bio-on .about-grid{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr)}}';
    document.head.appendChild(st);
    canvas=document.createElement('canvas');canvas.className='bio-edge';canvas.setAttribute('aria-hidden','true');
    sec.insertBefore(canvas,sec.firstChild);ctx=canvas.getContext('2d');
    sec.classList.add('cc-bio-on');
    layout();
    if('ResizeObserver' in window){var to=0;new ResizeObserver(function(){clearTimeout(to);to=setTimeout(layout,180);}).observe(sec);}
    else addEventListener('resize',function(){layout();},{passive:true});
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){layout();});
    if('IntersectionObserver' in window){new IntersectionObserver(function(e){visible=e[0].isIntersecting;if(visible){canvas.classList.add('on');start();}else stop();},{rootMargin:'120px'}).observe(sec);}
    else{visible=true;canvas.classList.add('on');start();}
  }

  /* ---------------- layout: everything that depends on where the photo cell is ---------------- */
  function layout(){
    var cellEl=sec.querySelector('.about-grid>:first-child');if(!cellEl||!canvas) return;
    var sr=sec.getBoundingClientRect(),cr=cellEl.getBoundingClientRect();
    var W=Math.round(sr.width),H=Math.round(sec.offsetHeight);if(W<50||H<50) return;
    var Wc=cr.width,P=Wc*.74,k=P/380;
    var px0=cr.left-sr.left+(Wc-P)/2, py0=cr.top-sr.top+84*k+10;
    var Q=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=Math.round(W*Q);canvas.height=Math.round(H*Q);canvas.style.width=W+'px';canvas.style.height=H+'px';
    var S={W:W,H:H,Q:Q,k:k,P:P,px0:px0,py0:py0};

    /* contour pixels, normals, inside test */
    var PEB=UNIT.map(function(u){return [px0+P*u[0],py0+P*u[1]];});
    function inside(x,y){var c=false;for(var i=0,j=N-1;i<N;j=i++){var xi=PEB[i][0],yi=PEB[i][1],xj=PEB[j][0],yj=PEB[j][1];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;}
    var NEAR=0;
    function sd(x,y){var m=1e9;for(var i=0;i<N;i++){var d=(PEB[i][0]-x)*(PEB[i][0]-x)+(PEB[i][1]-y)*(PEB[i][1]-y);if(d<m){m=d;NEAR=i;}}m=Math.sqrt(m);return inside(x,y)?-m:m;}
    var OUT=PEB.map(function(p,i){var a=PEB[(i-1+N)%N],b=PEB[(i+1)%N];var tx=b[0]-a[0],ty=b[1]-a[1],l=Math.hypot(tx,ty),nx=-ty/l,ny=tx/l;if(inside(p[0]+nx*3,p[1]+ny*3)){nx=-nx;ny=-ny;}return [nx,ny];});
    var pebPath=new Path2D();PEB.forEach(function(p,i){i?pebPath.lineTo(p[0],p[1]):pebPath.moveTo(p[0],p[1]);});pebPath.closePath();
    S.PEB=PEB;S.OUT=OUT;
    S.wd=Float32Array.from(OUT,function(o){return (90+110*smooth(-.1,.7,-.7*o[0]+.5*o[1]))*k;});   /* wide on the left and bottom, tight toward the text */
    S.off=new Float32Array(N);

    var IMG_W=768*k,IMG_H=698.4*k,IMG_X=px0-194*k,IMG_Y=py0-244*k,Z=1.2*k,POP_Y=py0+104*k;
    Object.assign(S,{IMG_W:IMG_W,IMG_H:IMG_H,IMG_X:IMG_X,IMG_Y:IMG_Y,POP_Y:POP_Y});

    /* pixel region the dissolve lives in */
    var pad=Math.ceil(110*k+D);
    var RX0=Math.floor(px0-pad),RY0=Math.floor(py0-pad),RW=Math.ceil(P+2*pad),RH=RW;
    var PW=Math.round(RW*Q),PH=Math.round(RH*Q);
    Object.assign(S,{RX0:RX0,RY0:RY0,RW:RW,RH:RH,PW:PW,PH:PH});

    /* head + beard matte (soft below the face so the curly edge survives) */
    var SW=640,SH=582,mk=function(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c;};
    var a0=mk(SW,SH),a0x=a0.getContext('2d');a0x.drawImage(imgS,0,0);var orig=a0x.getImageData(0,0,SW,SH);
    var al=mk(SW,SH),alx=al.getContext('2d'),AD=alx.createImageData(SW,SH);
    for(var q=0;q<orig.data.length;q+=4){AD.data[q]=AD.data[q+1]=AD.data[q+2]=255;AD.data[q+3]=orig.data[q+3];}
    alx.putImageData(AD,0,0);
    function blurred(px){var c=mk(SW,SH),x=c.getContext('2d');x.filter='blur('+px+'px)';x.drawImage(al,0,0);return x.getImageData(0,0,SW,SH).data;}
    var BD=blurred(3.2),BD2=blurred(1.3);
    var SA=new Float32Array(SW*SH),cut=mk(SW,SH),cx2=cut.getContext('2d');
    for(var i=0;i<SW*SH;i++){
      var low=true;   /* soft matte everywhere: keeps the hat brim's corner and the grey hair at the temple */
      var v=low?smooth(.22,.6,BD2[i*4+3]/255):smooth(.58,.86,BD[i*4+3]/255);
      var yst=IMG_Y+Math.floor(i/SW)*Z, fade=1-smooth(POP_Y+20*k,POP_Y+70*k,yst);
      SA[i]=Math.min(orig.data[i*4+3]/255,v);orig.data[i*4+3]=255*SA[i]*fade;
    }
    /* colour the head from the same photo as the pebble, so there is no seam where they meet */
    var bgx=mk(SW,SH).getContext('2d');bgx.drawImage(imgB,0,0);var BGD=bgx.getImageData(0,0,SW,SH).data;
    for(var j=0;j<orig.data.length;j+=4){orig.data[j]=BGD[j];orig.data[j+1]=BGD[j+1];orig.data[j+2]=BGD[j+2];}
    cx2.putImageData(orig,0,0);
    var headMask=mk(SW,SH),hmx=headMask.getContext('2d'),HM=hmx.createImageData(SW,SH);
    for(var m=0;m<SW*SH;m++){var y2=IMG_Y+Math.floor(m/SW)*Z;HM.data[m*4+3]=255*SA[m]*(1-smooth(POP_Y+20*k,POP_Y+70*k,y2));}
    hmx.putImageData(HM,0,0);
    S.cut=cut;
    var subjA=function(x,y){var u=Math.round((x-IMG_X)/Z),v2=Math.round((y-IMG_Y)/Z);if(u<0||v2<0||u>=SW||v2>=SH)return 0;return SA[v2*SW+u];};
    var nearHead=function(x,y){if(y>POP_Y+70*k)return false;for(var a=0;a<8;a++){var r=a?9:0,th=a*.785;if(subjA(x+Math.cos(th)*r,y+Math.sin(th)*r)>.25)return true;}return false;};
    var bs=mk(SW,SH).getContext('2d');bs.drawImage(imgB,0,0);var bot=bs.getImageData(0,578,640,1).data,br=0,bg=0,bb=0;for(var z=0;z<bot.length;z+=4){br+=bot[z];bg+=bot[z+1];bb+=bot[z+2];}var nb=bot.length/4;

    /* the photo on a region canvas, then its own edge colours smeared outward so nothing past the edge shows the arm */
    var photo=mk(PW,PH),px=photo.getContext('2d');px.setTransform(Q,0,0,Q,-RX0*Q,-RY0*Q);
    px.fillStyle='rgb('+(br/nb|0)+','+(bg/nb|0)+','+(bb/nb|0)+')';px.fillRect(IMG_X,IMG_Y,IMG_W,IMG_H+120*k);px.drawImage(imgB,IMG_X,IMG_Y,IMG_W,IMG_H);
    var PD=px.getImageData(0,0,PW,PH).data;
    var RAW=PEB.map(function(p,i){var x=Math.round((p[0]-OUT[i][0]*9*k-RX0)*Q),y=Math.round((p[1]-OUT[i][1]*9*k-RY0)*Q);x=clamp(x,0,PW-1);y=clamp(y,0,PH-1);var q2=(y*PW+x)*4;return [PD[q2],PD[q2+1],PD[q2+2]];});
    var EDGE=RAW.map(function(_,i){var s=[0,0,0];for(var j=-5;j<=5;j++){var c=RAW[(i+j+N)%N];s[0]+=c[0]/11;s[1]+=c[1]/11;s[2]+=c[2]/11;}return s;});
    var EXT=mk(PW,PH),ex=EXT.getContext('2d');ex.setTransform(Q,0,0,Q,-RX0*Q,-RY0*Q);ex.lineCap='round';ex.lineWidth=9*k;
    for(var n=0;n<N;n++){var p=PEB[n],o=OUT[n];ex.strokeStyle='rgb('+(EDGE[n][0]|0)+','+(EDGE[n][1]|0)+','+(EDGE[n][2]|0)+')';ex.beginPath();ex.moveTo(p[0]-o[0]*30*k,p[1]-o[1]*30*k);ex.lineTo(p[0]+o[0]*110*k,p[1]+o[1]*110*k);ex.stroke();}
    var ex2=mk(PW,PH),ex2x=ex2.getContext('2d');ex2x.filter='blur('+(3*Q)+'px)';ex2x.drawImage(EXT,0,0);
    ex.setTransform(1,0,0,1,0,0);ex.clearRect(0,0,PW,PH);ex.drawImage(ex2,0,0);
    ex.setTransform(Q,0,0,Q,-RX0*Q,-RY0*Q);ex.save();ex.clip(pebPath);ex.drawImage(photo,RX0,RY0,RW,RH);ex.restore();
    ex.setTransform(1,0,0,1,0,0);

    /* per-pixel tables for the dissolve */
    var n2=PW*PH,sdp=new Float32Array(n2),eip=new Uint16Array(n2),Fp=new Float32Array(n2);
    var COLS=Math.ceil(W/D)+1,ROWS=Math.ceil(H/D)+1,cell=new Int32Array(n2);
    for(var jj=0;jj<PH;jj++)for(var ii=0;ii<PW;ii++){var x=RX0+(ii+.5)/Q,y=RY0+(jj+.5)/Q,kk=jj*PW+ii;sdp[kk]=sd(x,y);eip[kk]=NEAR;Fp[kk]=FQ(x,y);
      cell[kk]=clamp(Math.round((y-5)/D),0,ROWS-1)*COLS+clamp(Math.round((x-5)/D),0,COLS-1);}
    var hc=mk(PW,PH),hcx=hc.getContext('2d');hcx.drawImage(headMask,(IMG_X-RX0)*Q,(IMG_Y-RY0)*Q,IMG_W*Q,IMG_H*Q);
    var outc=mk(PW,PH);
    Object.assign(S,{sdp:sdp,eip:eip,Fp:Fp,cell:cell,COLS:COLS,ROWS:ROWS,ext:ex.getImageData(0,0,PW,PH).data,hm:hcx.getImageData(0,0,PW,PH).data,out:outc,ox:outc.getContext('2d')});

    /* text rectangles: the matrix fades under the words */
    var lines=[];sec.querySelectorAll('.sec-label,h2,.about-grid p').forEach(function(el){var r=document.createRange();r.selectNodeContents(el);var rs=r.getClientRects();for(var i=0;i<rs.length;i++){var b=rs[i];lines.push([b.left-sr.left,b.top-sr.top,b.right-sr.left,b.bottom-sr.top]);}});
    var textF=function(x,y){var m=1e9;for(var i=0;i<lines.length;i++){var L=lines[i],dx=Math.max(L[0]-x,0,x-L[2]),dy=Math.max(L[1]-y,0,y-L[3]);m=Math.min(m,Math.hypot(dx,dy));}return .10+.90*smooth(2,30,m);};

    /* matrix dots */
    var dots=[];
    for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){var x2=c*D+5,y2b=r*D+5,dd=sd(x2,y2b);
      dots.push({i:dots.length,x:x2,y:y2b,sd:dd,ei:NEAR,tf:textF(x2,y2b),head:nearHead(x2,y2b),fy:smooth(0,40,y2b)*smooth(0,150,H-y2b)});}
    S.dots=dots;S.tf=new Float32Array(COLS*ROWS);dots.forEach(function(d){S.tf[d.i]=d.tf;});
    S.cfe=new Float32Array(COLS*ROWS);
    S.zone=dots.filter(function(d){return d.sd<300*k&&d.sd>-330*k;});
    ST=S;built=true;
    if(!canvas.getAttribute('data-ready')){canvas.setAttribute('data-ready','1');var rr0=sec.getBoundingClientRect();
      if(rr0.bottom>-120&&rr0.top<innerHeight+120){visible=true;canvas.classList.add('on');}}
    if(REDUCED||!running) draw(T);
  }

  /* ---------------- drawing ---------------- */
  function draw(t){
    var S=ST;if(!S||!ctx) return;
    var Q=S.Q,k=S.k,N2=N;
    for(var q=0;q<N2;q++){var p=S.PEB[q];S.off[q]=7*k*FE(p[0],p[1],t);}
    for(var z=0;z<S.zone.length;z++){var d0=S.zone[z];S.cfe[d0.i]=FE(d0.x,d0.y,t);}
    ctx.setTransform(Q,0,0,Q,0,0);ctx.clearRect(0,0,S.W,S.H);
    /* burgundy matrix on cream */
    for(var i=0;i<S.dots.length;i++){var d=S.dots[i];if(d.head)continue;
      var wd=S.wd[d.ei],s=d.sd-S.off[d.ei],kk=smooth(wd*.25,wd*.75,s);if(kk<=.02)continue;
      var m=mag(field(d.x,d.y,t)),r=(.9+(R_PEAK-.9)*Math.pow(m,1.5))*kk;if(r<.5)continue;
      var c=lerp3(CREAM_LO,BURG,Math.min(1,m*1.25)),a=(.035+.72*Math.pow(m,1.1))*d.tf*Math.min(1,kk*1.4)*d.fy;
      ctx.fillStyle='rgba('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+','+a.toFixed(3)+')';ctx.beginPath();ctx.arc(d.x,d.y,r,0,7);ctx.fill();}
    /* the photo as a halftone */
    var PWd=S.PW,PHt=S.PH,img=S.ox.createImageData(PWd,PHt),o=img.data,n=PWd*PHt,off=S.off,wdA=S.wd,tfA=S.tf;
    for(var j=0;j<n;j++){
      var ei=S.eip[j],w2=wdA[ei],s2=S.sdp[j]-off[ei],tt=(s2+w2/2)/w2,aa,hm=S.hm[j*4+3]/255;
      if(tt>=1){if(hm<=0)continue;aa=hm;}
      else if(tt<=0)aa=1;
      else{var cv=1-tt*tt*(3-2*tt);cv+=.6*S.cfe[S.cell[j]]*cv*(1-cv);cv=cv<0?0:cv>1?1:cv;
        aa=(S.Fp[j]-THR[(cv*255)|0])*5+.5;aa=aa<0?0:aa>1?1:aa;if(hm>aa)aa=hm;if(aa<=0)continue;}
      var qq=j*4,rr=S.ext[qq],gg=S.ext[qq+1],bb=S.ext[qq+2];
      if(tt>0&&hm<.99){var mm=smooth(-w2*.05,w2*.45,s2)*(1-hm);rr+=(74-rr)*mm;gg+=(21-gg)*mm;bb+=(37-bb)*mm;aa*=1-(1-tfA[S.cell[j]])*smooth(0,w2*.5,s2);}
      o[qq]=rr;o[qq+1]=gg;o[qq+2]=bb;o[qq+3]=aa*255;}
    S.ox.putImageData(img,0,0);
    ctx.drawImage(S.out,S.RX0,S.RY0,S.RW,S.RH);
    /* head and beard stay solid and rise out of the photo */
    ctx.save();ctx.beginPath();ctx.rect(S.IMG_X,0,S.IMG_W,S.POP_Y+70*k);ctx.clip();ctx.drawImage(S.cut,S.IMG_X,S.IMG_Y,S.IMG_W,S.IMG_H);ctx.restore();
  }

  function frame(now){
    if(!running) return;
    raf=requestAnimationFrame(frame);
    var minGap=innerWidth<761?40:16;if(now-last<minGap) return;
    var dt=Math.min(.05,(now-last)/1000)*1.15;last=now;T+=dt;driftWaves(dt);
    if(built) draw(T);
  }
  function start(){
    if(!built){return;}
    if(REDUCED){draw(T);return;}
    if(running||document.hidden) return;running=true;last=performance.now();raf=requestAnimationFrame(frame);
  }
  function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=0;}
  document.addEventListener('visibilitychange',function(){if(document.hidden)stop();else if(visible)start();});
  /* start once the first layout has finished building */
  var wait=setInterval(function(){if(built){clearInterval(wait);if(visible)start();}},120);
})();
