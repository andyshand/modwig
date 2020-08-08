import { createConnection } from "typeorm"
import { Project } from "./entities/Project"
import { ProjectTrack } from "./entities/ProjectTrack"
import { sqlitePath, sqliteBackupPath } from '../config'
const fs = require('fs')
const path = require('path')

let conn
export async function getDb() {
    if (!conn) {
        const newdb = !fs.existsSync(sqlitePath)
        fs.readdir(sqliteBackupPath, (err, files) => {
            if (err) {
                return console.error(err)
            }
            files.forEach((file) => {
                fs.stat(path.join(sqliteBackupPath, file), function (err, stat) {
                    if (err) {
                        return console.error(err);
                    }
                    const expiry = new Date(stat.ctime).getTime() + 1000 * 60 * 60 * (files.length > 20 ? 1 : 7 * 24);
                    if (new Date().getTime() > expiry) {
                        fs.unlink(path.join(sqliteBackupPath, file), err => {
                            if (err) {
                                console.error(err)
                            } else {
                                console.log('Deleted old SQLite backup')
                            }
                        })
                    }
                });
            });
        });
        if (!newdb) {
            console.log('Backing up current db')
            fs.copyFile(sqlitePath, path.join(sqliteBackupPath, `db.${new Date().getTime()}.sqlite`), err => {
                if (err) console.error(err)
            })
        }

        console.log('Creating connection')
        conn = await createConnection({
            type: "sqlite",
            database: sqlitePath,
            entities: [Project, ProjectTrack],
            synchronize: true, // TODO change for production
            migrations: [path.join(__dirname, "./migrations/*.js")],
        })
        console.log('About to run migrations...')
        await conn.runMigrations({
            transaction: false
        });
        console.log('Migration ran successfully!')
    }

    return conn
}