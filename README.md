# 🎰 Lotería Felmar - Aplicación Web de Gestión Integral

![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-092E20?logo=django&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)

## 📖 Descripción General
**Lotería Felmar Web** es una plataforma digital desarrollada para modernizar y automatizar los procesos operativos de la agencia física Lotería Felmar C.A. La aplicación permite la centralización de operaciones, gestionando la compra digital de tickets, la sincronización automática de resultados mediante Web Scraping y un sistema de notificaciones asíncronas para ganadores.

Este proyecto fue realizado como Trabajo de Pasantía para la **Universidad Central de Venezuela (UCV) - Escuela de Computación**.

## ✨ Características Principales
* **🔐 Autenticación y Perfiles:** Registro seguro de usuarios, control de sesiones mediante middleware personalizado, y gestión de perfiles con saldo de billetera.
* **🎟️ Módulo de Apuestas:** Sistema validado para la compra de tickets de loterías tradicionales (Triples, Terminales) y Animalitos. Incluye reglas de negocio estrictas como validación de horario de cierre y cálculo automático de montos.
* **💰 Billetera Virtual:** Sistema integrado para solicitar recargas de saldo (vía Pago Móvil) y gestionar los fondos.
* **🤖 Scraping Automatizado:** Extracción y actualización de resultados de fuentes externas en tiempo real utilizando `BeautifulSoup4` y `Requests`.
* **🏆 Verificación de Ganadores:** Algoritmo de comprobación (`check_ticket_results`) para verificar apuestas y notificar a los usuarios ganadores a través de notificaciones asíncronas.
* **📱 Diseño Mobile-First:** Interfaz moderna y completamente responsiva construida con CSS3, adaptada perfectamente tanto para computadoras de escritorio como dispositivos móviles.

## 🛠️ Stack Tecnológico
**Backend:**
* [Python](https://www.python.org/)
* [Django 6.0](https://www.djangoproject.com/)
* Base de datos relacional (SQLite para entorno de desarrollo local)
* BeautifulSoup4 & Requests (Web Scraping)

**Frontend:**
* HTML5 Semántico
* CSS3 (Flexbox & CSS Grid)
* JavaScript Vanilla (Validaciones, Fetch API para el carrito de compras, alertas interactivas)

## 📁 Estructura del Proyecto
El proyecto implementa la arquitectura MVT (Model-View-Template) propia de Django:
* `models.py`: Estructuración de las entidades principales (Profiles, Tickets, Results, Payments).
* `views.py`: Lógica de negocio (manejo de sesiones, APIs de compra, panel de control `dashboard`).
* `urls.py`: Enrutamiento y endpoints del proyecto.
* `utils.py`: Herramientas auxiliares y scripts para obtener y procesar datos externos.

## 🚀 Instalación y Ejecución Local

Sigue estos pasos para configurar el entorno de desarrollo en tu máquina local:

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/AleexCh08/loteria-felmar-web.git
   cd loteria-felmar-web
   ```

2. **Crear y activar un entorno virtual**
   ```bash
   python -m venv venv
   # En Windows:
   venv\Scripts\activate
   # En macOS/Linux:
   source venv/bin/activate
   ```

3. **Instalar dependencias**
   ```bash
   pip install -r requirements.txt
   ```

4. **Aplicar migraciones a la base de datos**
   ```bash
   python manage.py migrate
   ```

5. **Ejecutar el servidor de desarrollo**
   ```bash
   python manage.py runserver
   ```
6. Abre tu navegador y accede a `http://127.0.0.1:8000`.

## 👨‍💻 Autor
**Alexander Churio**
* Desarrollador Web Full Stack
* Escuela de Computación, Facultad de Ciencias - Universidad Central de Venezuela (UCV).
* [GitHub: AleexCh08](https://github.com/AleexCh08)
