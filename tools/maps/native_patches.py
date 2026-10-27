"""Exact, fail-closed native seams for isolated authored-map candidates."""
PATCHES={
 'src/game/equipment-render.js':[('const g=new T3.Group();g.name=id;', 'const g=new T3.Group();g.name=node.name||id;')],
 'src/game/02-state.js':[
  ('function terrainWaypoint(x,y,tx,ty){\n  const p=terrainNow();','function terrainWaypoint(x,y,tx,ty,p=terrainNow()){\n  '),
  ('function terrainMove(entity,x,y){const p=terrainNow();','function terrainMove(entity,x,y){const p=authoredTerrainPlan(entity);')],
 'src/game/03-combat.js':[
  ('waypoint=terrainWaypoint(m.x,m.y,goalX,goalY)','waypoint=terrainWaypoint(m.x,m.y,goalX,goalY,authoredTerrainPlan(m))'),
  ('const [tx,ty]=terrainProject(goalX,goalY);m.fight','const [tx,ty]=terrainProject(goalX,goalY,authoredTerrainPlan(m));m.fight'),
  ('for(const m of G.mons)[m.x,m.y]=terrainProject(m.x,m.y);','for(const m of G.mons)[m.x,m.y]=terrainProject(m.x,m.y,authoredTerrainPlan(m));')],
 'src/game/04-render.js':[
  ('for(const m of G.mons)[m.x,m.y]=terrainProject(m.x,m.y);','for(const m of G.mons)[m.x,m.y]=terrainProject(m.x,m.y,authoredTerrainPlan(m));')]
}
