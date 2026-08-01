import sqlite3

def fix_database():
    conn = sqlite3.connect("lifeos.db")
    cursor = conn.cursor()
    
    # Enable foreign keys off during schema update
    cursor.execute("PRAGMA foreign_keys = OFF;")
    
    tables_to_fix = {
        "users": """
            CREATE TABLE users_new (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
                email VARCHAR NOT NULL UNIQUE, 
                hashed_password VARCHAR NOT NULL, 
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """,
        "memories": """
            CREATE TABLE memories_new (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
                user_id INTEGER NOT NULL, 
                content VARCHAR NOT NULL, 
                embedding TEXT NOT NULL, 
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                FOREIGN KEY(user_id) REFERENCES users (id)
            );
        """,
        "tasks": """
            CREATE TABLE tasks_new (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
                user_id INTEGER NOT NULL, 
                title VARCHAR NOT NULL, 
                status VARCHAR NOT NULL, 
                due_date DATETIME, 
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                created_by_agent VARCHAR, 
                conversation_id INTEGER, 
                google_calendar_event_id VARCHAR, 
                calendar_synced VARCHAR DEFAULT 'false', 
                FOREIGN KEY(user_id) REFERENCES users (id)
            );
        """,
        "goals": """
            CREATE TABLE goals_new (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
                user_id INTEGER NOT NULL, 
                title VARCHAR NOT NULL, 
                description TEXT, 
                status VARCHAR NOT NULL, 
                target_date DATETIME, 
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                created_by_agent VARCHAR, 
                conversation_id INTEGER, 
                is_template VARCHAR DEFAULT 'false', 
                FOREIGN KEY(user_id) REFERENCES users (id)
            );
        """,
        "conversations": """
            CREATE TABLE conversations_new (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, 
                user_id INTEGER NOT NULL, 
                role VARCHAR NOT NULL, 
                content TEXT NOT NULL, 
                agent_used VARCHAR, 
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                session_id INTEGER, 
                FOREIGN KEY(user_id) REFERENCES users (id)
            );
        """
    }

    for table, new_sql in tables_to_fix.items():
        print(f"Fixing schema for table '{table}'...")
        cursor.execute(new_sql)
        
        # Get columns of original table
        cursor.execute(f"PRAGMA table_info({table});")
        cols = [col[1] for col in cursor.fetchall()]
        col_list = ", ".join(cols)
        
        # Copy data
        cursor.execute(f"INSERT INTO {table}_new ({col_list}) SELECT {col_list} FROM {table};")
        cursor.execute(f"DROP TABLE {table};")
        cursor.execute(f"ALTER TABLE {table}_new RENAME TO {table};")
        
    conn.commit()
    cursor.execute("PRAGMA foreign_keys = ON;")
    conn.close()
    print("Database schema successfully migrated from now() to CURRENT_TIMESTAMP!")

if __name__ == "__main__":
    fix_database()
