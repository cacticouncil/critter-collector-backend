const DatabaseService = require('../services/DatabaseService');
const ValidationService = require('../services/ValidationService');
const bcrypt = require('bcrypt');

/*
 * Checks if a player profile already exists in the designated data cluster. 
 */
exports.checkProfile = async (req, res, next) => {
    let { username } = req.query;

    if (!username) {
        return res.status(400).end();
    }

    try {
        username = ValidationService.sanitizeStrings(username);

        const database = req.app.locals.db;

        const player = await DatabaseService.findPlayerProfile(database, username);
        const playerExists = (player.length > 0) ? true : false;
        res.status(200).json({ "player_exists": playerExists });
    }
    catch (error) {
        next(error);
    }
}
exports.logIn = async (req, res, next) => {
    let { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).end();
    }
    try {
        const database = req.app.locals.db;

        const player = await DatabaseService.findPlayerProfile(database, username);

        const playerExists = (player.length > 0) ? true : false;
        if (!playerExists) {
            return res.status(401).json({ "Successful Login": playerExists});
        }
        const pass = await DatabaseService.findPlayerPassword(database, username);

        if (await bcrypt.compare(password, pass[0].password)) {
            res.status(200).json({ "Successful Login": playerExists });
        }
        else {res.status(401).json({ "Successful Login": !playerExists });
        }
    }
    catch (error) {
        next (error);
    }
}

/*
 * Creates a new profile for a user, initializing their collection to 0 
 */
exports.createNewProfile = async (req, res, next) => {
    let { username, email, password } = req.body;


    if (!username || !email || !password) {
        return res.status(400).end();
    }

    try {
        [username, email, password] = ValidationService.sanitizeStrings(username, email, password);

        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt)

        const database = req.app.locals.db;

        const response = await DatabaseService.insertNewPlayer(database, username, email, hashedPassword);

        if (response?.user_name == username) {
            return res.status(200).json({ "insert_player": "Player profile created successfully" });
        }

        res.status(422).json({ "insert_player": "Player profile not created successfully" });
    }
    catch (error) {
        next(error);
    }
}


/*
 * Adds a new animal to a user's collection or increments the counter if it
 * already exists.
 */
exports.updateProfile = async (req, res, next) => {
    let { username, common_animal, scientific_animal } = req.body;

    if (!username || !common_animal || !scientific_animal) {
        return res.status(400).end();
    }

    try {
        [username, common_animal, scientific_animal] = ValidationService.sanitizeStrings(username, common_animal, scientific_animal);

        const database = req.app.locals.db;

        const foundAnimal = await DatabaseService.findAnimalInProfile(database, username, common_animal, scientific_animal);

        var response;

        if (foundAnimal.length > 0) {
            response = await DatabaseService.updatePlayerAnimalCount(database, username, foundAnimal[0]);
        }
        else {
            response = await DatabaseService.insertAnimalInProfile(database, username, common_animal, scientific_animal);
        }

        if (response.modifiedCount > 0) {
            return res.status(200).json({ "update_profile": "Player profile updated successfully" });
        }

        res.status(422).json({ "update_profile": "Player profile not updated successfully" });
    }
    catch (error) {
        next(error);
    }

}


/*
 * Deletes a user's record from the database
 */
exports.deleteProfile = async (req, res, next) => {
    let { username } = req.body;

    if (!username) {
        return res.status(400).end();
    }

    try {
        username = ValidationService.sanitizeStrings(username);

        const database = req.app.locals.db;

        const response = await DatabaseService.removePlayerProfile(database, username);

        if (response.deletedCount > 0) {
            return res.status(200).json({ "remove_profile": "Profile removed successfully" });
        }

        res.status(422).json({ "remove_profile": "Profile not removed successfully" });
    }
    catch (error) {
        next(error);
    }
}