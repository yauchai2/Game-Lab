/* Single metric layout policy shared by asset review and the native terrain adapter. */
const FI02_LAYOUT_KIT={create(L){
 function inside(x,y,polygon=L.footprint){let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
 const rectDistance=(x,y,c,s)=>Math.hypot(Math.max(0,Math.abs(x-c[0])-s[0]/2),Math.max(0,Math.abs(y-c[1])-s[1]/2));
 function segmentDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);}
 function walkable(x,y,r=L.navigation.heroRadius){if(!inside(x,y))return false;for(let i=0;i<L.footprint.length;i++)if(segmentDistance(x,y,L.footprint[i],L.footprint[(i+1)%L.footprint.length])<r+L.navigation.edgeInset)return false;
  for(const b of L.buildings){const e=b.collisionFrontExtension||0;if(rectDistance(x,y,[b.center[0],b.center[1]-e/2],[b.size[0],b.size[1]+e])<r)return false;}
  for(const p of L.props)if(p.size?rectDistance(x,y,p.center,p.size)<r:Math.hypot(x-p.center[0],y-p.center[1])<r+p.radius)return false;
  for(const q of L.rails)if(rectDistance(x,y,q.center,q.size)<r)return false;
  for(const p of L.bridge.piers)if(rectDistance(x,y,p,[.65,.65])<r)return false;return true;
 }
 return {inside,walkable,rectDistance,segmentDistance};
}};
