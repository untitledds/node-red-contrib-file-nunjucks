function cloneAndSanitize(obj, seen = new WeakMap()) {
  // Примитивы и null/undefined возвращаем как есть
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Защита от циклических ссылок
  if (seen.has(obj)) {
    return seen.get(obj);
  }

  // Специальная обработка для Date и других встроенных объектов
  if (obj instanceof Date) {
    return new Date(obj);
  }

  // Очищаем прототип и создаем чистый объект
  const cleanObj = Object.create(null);
  seen.set(obj, cleanObj);

  // Обрабатываем массивы
  if (Array.isArray(obj)) {
    const cleanArr = [];
    seen.set(obj, cleanArr);
    obj.forEach((item, index) => {
      cleanArr[index] = cloneAndSanitize(item, seen);
    });
    return cleanArr;
  }

  // Копируем свойства, исключая опасные
  for (const key of Object.keys(obj)) {
    // Пропускаем потенциально опасные свойства
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    if (descriptor && descriptor.get) {
      // Пропускаем геттеры
      continue;
    }

    cleanObj[key] = cloneAndSanitize(obj[key], seen);
  }

  return cleanObj;
}

module.exports = function createSandbox(data) {
  const sanitized = cloneAndSanitize(data);

  return new Proxy(sanitized, {
    get(target, prop) {
      // Запрещаем доступ к специальным свойствам и символам
      if (typeof prop === 'symbol') {
        return undefined;
      }

      // Защита от Promise
      if (prop === 'then' && target instanceof Promise) {
        return undefined;
      }

      // Разрешаем доступ только к "безопасным" свойствам
      if (prop in target) {
        return target[prop];
      }

      return undefined;
    },
    set() {
      return false; // полный запрет на модификацию
    },
    deleteProperty() {
      return false; // запрет на удаление свойств
    },
    defineProperty() {
      return false; // запрет на определение новых свойств
    },
    getPrototypeOf() {
      return null; // возвращаем null для прототипа
    },
    setPrototypeOf() {
      return false; // запрет на изменение прототипа
    }
  });
};