const { hash, compare } = require("bcryptjs");
const AppError = require("../utils/AppError");

const sqliteConnection = require("../database/sqlite");
const UserCreateService = require("../Services/UserCreateService");
const UserRepository = require("../repositories/userRepository");


class UsersController {
  async create(request, response) {
    const { name, password, email } = request.body;

    const userRepository = new UserRepository()
    const userCreateService = new UserCreateService(userRepository)

    await userCreateService.execute({name, password, email})

    return response.status(201).json();
  }

  async update(request, response) {
    const { name, email, password, old_password } = request.body;
    const user_id = request.user.id;

    const database = await sqliteConnection();
    const user = await database.get("SELECT * FROM users WHERE id = (?)", [user_id]);

    if (!user) {
      throw new AppError("Usuário não encontrado");
    }

    const userWithUpdatedEmail = await database.get(
      "SELECT * FROM users WHERE email = (?)",
      [email]
    );

    if (userWithUpdatedEmail && userWithUpdatedEmail.id !== user.id) {
      throw new AppError("Este e-mail já está em uso.");
    }

    user.name = name ?? user.name;
    user.email = email ?? user.email;

    if (password && !old_password) {
      throw new AppError("Você precisa informar a senha antiga.");
    }

    if (password && old_password) {
      const checkOldPassword = await compare(old_password, user.password);

      if (!checkOldPassword) {
        throw new AppError("A senha antiga não confere.");
      }

      user.password = await hash(password, 8);
    }

    console.log(user);
    await database.run(
      `
    UPDATE users SET
    name = ?,
    email = ?,
    password= ?,
    update_at = DATETIME('now')
    WHERE id = ?`,
      [user.name, user.email, user.password, user_id]
    );

    return response.json();
  }
  /**
   * index - GET para listar vários registros.
   * show - GET para exibir um registro expecifico.
   * create - POST para criar um registro.
   * update - PUT oara atualizar um registro.
   * delete - DELETE para remover um registro
   */
}
module.exports = UsersController;
