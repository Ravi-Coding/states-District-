const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3003, () => {
      console.log("Server Running at http://localhost:3003/");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    stateName: dbObject.state_name,
    population: dbObject.population,
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

// Returns a list of all states in the state table (API 1)

app.get("/states", async (request, response) => {
  const stateNames = ` 
    SELECT
    * 
    FROM 
    state 
    `;
  const allStatesArray = await db.all(stateNames);
  response.send(
    allStatesArray.map((eachState) =>
      convertDbObjectToResponseObject(eachState)
    )
  );
});

// Returns a state based on the state ID(API 2)

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `
    SELECT 
    *
    FROM 
    state 
    WHERE 
    state_id = ${stateId}`;
  const stateDetails = await db.get(stateQuery);
  response.send(convertDbObjectToResponseObject(stateDetails));
});

// Create a district in the district table, district_id is auto-incremented(API 3)

app.post("/districts/", async (request, response) => {
  const newDistrict = request.body;

  const { districtName, stateId, cases, cured, active, deaths } = newDistrict;
  const addNewDistrict = `

  INSERT INTO 
  district (district_name,
  state_id,
  cases,
  cured,
  active,
  deaths)

  VALUES (
      '${districtName}',
  ${stateId},
  ${cases},
  ${cured},
  ${active},
  ${deaths},
  )`;
  const dbResponse = await db.run(addNewDistrict);
  const districtId = dbResponse.lastID;
  response.send("District Successfully Added");
});

// Returns a district based on the district ID(API 4)
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = `
    SELECT 
    * 
    FROM
    district
    WHERE district_id = ${districtId}`;
  const districtArray = await db.get(districtDetails);
  response.send(convertDbObjectToResponseObject(districtArray));
});

// Deletes a district from the district table based on the district ID (API 5)

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const removeDistrict = ` 
    SELECT 
    * 
    FROM 
    district 
    WHERE district_id = ${districtId}`;
  await db.run(removeDistrict);
  response.send("District Removed");
});

// Updates the details of a specific district based on the district ID (API 6)

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const updateDistrictDetails = ` 
UPDATE 
district 
SET 
 district_name = '${districtName},
  state_id =${stateId},
  cases = ${cases},
  cured = ${cured},
  active = ${active},
  deaths = ${deaths}
  WHERE 
  district_id = ${districtId}`;

  await db.run(updateDistrictDetails);
  response.send("District Details Updated");
});

// Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID (API 7)

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `
    SELECT 
     SUM(cases),
     SUM(cured),
     SUM(active),
     SUM(deaths)
     FROM 
     district 
     WHERE 
     state_id = ${stateId}`;
  const stateDetails = await db.get(stateQuery);
  response.send({
    totalCases: stateDetails["SUM(cases)"],
    totalCured: stateDetails["SUM(cured)"],
    totalActive: stateDetails["SUM(active)"],
    totalDeaths: stateDetails["SUM(deaths)"],
  });
});

// Returns an object containing the state name of a district based on the district ID (API 8)

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateQuery = ` 
    SELECT 
    state_name 
    FROM 
    state JOIN district
    ON state.state_id = district.state_id
    WHERE
    district.district_id = ${districtId}`;
  const stateName = await db.get(stateQuery);
  response.send(convertDbObjectToResponseObject(stateName));
});
module.exports = app;
