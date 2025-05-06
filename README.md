---- Use both repo to test it out (Unity3d_project_for_login_saveGame && Nodejs_server_for_Unity3dGame_Login_saveData) ----

->Unity 3d game custom login and register. Saving game data on cloud (node + mongo) and fetching it like player profile pic, gems, gold, xp, level ...etc else can be added.

-> Run nodejs server connect it with mongodb server ( code in other repo called 'Nodejs_server_for_Unity3dGame_Login_saveData').

->In project forms are used to transmit data which is safer than query, router is used for scalability, Regular expression (regexp) for password strength, Multer is used for user pofile pic save cause Cleaner and more secure for real-world production apps ( can use Binary Data Upload if you prefer).

-> argon2 for password hashing , 
-> ip blocking after few time password wrong enter.
