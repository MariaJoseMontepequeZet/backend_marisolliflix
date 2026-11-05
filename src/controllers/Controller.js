// Clase base de los controladores. Todo metodo publico de la clase hija recibe (req, res)
// y, si falla, el error se manda a next() para que lo atrape el errorHandler.
// Asi ningun controlador repite el try/catch. Los metodos privados (#) no se envuelven.
class Controller {
  constructor() {
    const prototipo = Object.getPrototypeOf(this);
    for (const nombre of Object.getOwnPropertyNames(prototipo)) {
      if (nombre === 'constructor') continue;
      const metodo = prototipo[nombre].bind(this);
      this[nombre] = async (req, res, next) => {
        try {
          await metodo(req, res);
        } catch (error) {
          next(error);
        }
      };
    }
  }

  // Datos de paginacion que se agregan a las respuestas de listas
  static paginacion({ page, limit, total }) {
    return { page, limit, total, pages: Math.ceil(total / limit) };
  }
}

module.exports = Controller;
