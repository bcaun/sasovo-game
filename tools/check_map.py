import math,json,sys
K=260;C=math.cos(math.radians(55))
def raw(lon,lat): return ((lon-35)*K*C,(57.1-lat)*K)
MX,MY=raw(37.62,55.75)
def P(lon,lat):
    x,y=raw(lon,lat);dx,dy=x-MX,y-MY;r=math.hypot(dx,dy);f=1+0.6*math.exp(-r/120)
    return (MX+dx*f,MY+dy*f)
exec(open(__import__('os').path.join(__import__('os').path.dirname(__file__),'map_data.py')).read())
pos={}
for c in CITIES:
    id,n,lon,lat=c[:4]; x,y=P(lon,lat); dx,dy=NUDGE.get(id,(0,0)); pos[id]=(x+dx,y+dy)
edges=[]
for r in ROUTES:
    a,b=r[0],r[1]
    assert a in pos and b in pos,(a,b)
    if (a,b) not in edges and (b,a) not in edges: edges.append((a,b))
def cross(p1,p2,p3,p4):
    def o(a,b,c): return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    d1,d2,d3,d4=o(p3,p4,p1),o(p3,p4,p2),o(p1,p2,p3),o(p1,p2,p4)
    return d1*d2<0 and d3*d4<0
def segdist(p,a,b):
    ax,ay=a;bx,by=b;px,py=p;L=(bx-ax)**2+(by-ay)**2;t=max(0,min(1,((px-ax)*(bx-ax)+(py-ay)*(by-ay))/L))
    return math.hypot(px-ax-t*(bx-ax),py-ay-t*(by-ay))
bad=0
for i,(a,b) in enumerate(edges):
    for (c,d) in edges[i+1:]:
        if len({a,b,c,d})<4: continue
        if cross(pos[a],pos[b],pos[c],pos[d]): print("CROSS",a,b,"x",c,d);bad+=1
    for cid,p in pos.items():
        if cid in (a,b): continue
        if segdist(p,pos[a],pos[b])<20: print("NEAR",cid,"on",a,b,round(segdist(p,pos[a],pos[b])));bad+=1
ids=list(pos)
for i in range(len(ids)):
    for j in range(i+1,len(ids)):
        d=math.dist(pos[ids[i]],pos[ids[j]])
        if d<38: print("CLOSE",ids[i],ids[j],round(d));bad+=1
deg={k:0 for k in pos}
for a,b in edges: deg[a]+=1;deg[b]+=1
print("isolated",[k for k,v in deg.items() if v==0])
print("edges",len(edges),"problems",bad)

