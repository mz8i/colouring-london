import express from 'express';

import buildingController from '../controllers/buildingController';

const server = express.Router();


// GET buildings
// not implemented - may be useful to GET all buildings, paginated

// GET buildings at point
server.get('/buildings/locate', buildingController.locateBuilding);

// GET buildings by reference (UPRN/TOID or other identifier)
server.get('/buildings/reference', buildingController.listBuildingsByReference);

server.route('/building/:building_id.json')
    // GET individual building
    .get(buildingController.getBuildingById)
    // POST building updates
    .post(buildingController.updateBuildingById);


// GET building UPRNs
server.get('/building/:building_id/uprns.json', buildingController.getBuildingUPRNsById);

// GET/POST like building
server.route('/building/:building_id/like.json')
    .get(buildingController.getBuildingLikeById)
    .post(buildingController.setBuildingLikeById);

export default server;