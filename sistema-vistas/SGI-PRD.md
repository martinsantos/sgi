# **Documento de Requisitos del Producto (PRD)**

## **SIGUM V2 \- Backlog Completo**

### **1\. Introducción y Propósito**

Este documento define los requisitos funcionales para el sistema **SIGUM V2**, abarcando el backlog completo del producto. El objetivo es proporcionar una visión integral de las funcionalidades requeridas, organizadas en releases y módulos, para guiar el desarrollo continuo del sistema.

El PRD detalla las necesidades a través de Épicas e Historias de Usuario, cubriendo desde el ciclo comercial y de gestión de proyectos hasta los módulos de administración, finanzas, CRM y licitaciones.

### **2\. Roles de Usuario Involucrados**

* **Responsable comercial / Vendedor:** Encargado de la gestión de cartera de clientes, prospectos y propuestas comerciales.  
* **Líder de Célula:** Responsable de la evaluación y seguimiento de licitaciones.  
* **Responsable de la gestión de proyectos:** Supervisa el ciclo de vida completo del proyecto.  
* **Líder de Ingeniería / Técnico Proyectista:** Define los requerimientos técnicos, lista de materiales y solicitudes de compra.  
* **Responsable de logística de abastecimiento / Compras:** Gestiona el catálogo de productos, cotizaciones y órdenes de compra.  
* **Líder de Obra / Jefe de Obra:** Gestiona la ejecución en campo y solicita materiales.  
* **Responsable de abastecimiento / despacho:** Coordina la recepción, acopio y entrega de materiales.  
* **Responsable de SSCC / Auxiliar administrativo:** Encargado de la gestión contable, financiera y de facturación.  
* **Integrante del equipo de proyecto:** Ejecuta tareas y reporta horas.

### **3\. Product Backlog**

A continuación se detallan las épicas e historias de usuario que componen el backlog completo del producto.

### **Módulo: Release 1 \- Ciclo Básico de una Solución de TI**

*Este release se enfoca en implementar el flujo fundamental de un proyecto, desde la oportunidad comercial hasta la entrega.*

#### **Épica 1: Gestión Comercial Inicial**

| ID | Como (Rol) | Necesito (Funcionalidad) | Para (Propósito) | Criterios de Aceptación |
| :---- | :---- | :---- | :---- | :---- |
| **1** | Responsable comercial | Registrar los prospectos comerciales | Desarrollar el seguimiento de los prospectos | \- Formulario de ABM de Prospectos.\<br\>- Permitir un alta rápida de clientes.\<br\>- Los prospectos deben tener un **\[Estado\]** para categorizar la gestión. |
| **2** | Responsable comercial | Registrar los presupuestos comerciales | Desarrollar el seguimiento de los presupuestos | \- Formulario de ABM de Presupuestos.\<br\>- Atributo **\[Tipo\]**: Provisión de equipos, Servicios IT, Soluciones IT.\<br\>- Vincular presupuesto al prospecto de origen. |
| **3** | Responsable comercial | Elaborar los presupuestos comerciales | Presentar la propuesta comercial al cliente | \- Formularios específicos para presupuestos de provisión de equipos, soluciones IT y servicios IT. |
| **3.1.1** | Responsable de logística | Actualizar los precios de materiales de proveedores | Mantener el catálogo de productos | \- Definir parámetros para el Web Service (WS) que interactuará con el proveedor. |

#### **Épica 2: Gestión y Planificación de Proyectos**

| ID | Como (Rol) | Necesito (Funcionalidad) | Para (Propósito) | Criterios de Aceptación |
| :---- | :---- | :---- | :---- | :---- |
| **4** | Responsable de gestión de proyectos | Activar los proyectos vinculados a presupuestos adjudicados | Iniciar la ejecución del proyecto | \- Formulario de activación de proyectos.\<br\>- Asociar el proyecto al presupuesto de origen. |
| **5** | Responsable de gestión de proyectos | Planificar el proyecto | Coordinar los paquetes de tareas y permitir la carga de horas del equipo | \- Rediseñar el Plan de Tareas según la experiencia de los usuarios. |
| **6** | Líder de Ingeniería | Elaborar la Lista de materiales del proyecto | Definir los requerimientos de materiales del proyecto | \- Rediseñar la Lista de materiales según la experiencia de los usuarios y el nuevo proceso de abastecimiento. |

#### **Épica 3: Proceso de Abastecimiento y Compras**

| ID | Como (Rol) | Necesito (Funcionalidad) | Para (Propósito) | Criterios de Aceptación |
| :---- | :---- | :---- | :---- | :---- |
| **8** | Responsable de logística | Elaborar los requerimientos de abastecimiento | Planificar las compras del proyecto | \- Rediseñar los requerimientos de abastecimiento según la experiencia de los usuarios. |
| **9** | Responsable de logística | Elaborar los pedidos de cotización a proveedores | Solicitar los precios de los materiales | \- Rediseñar el pedido de cotización según la experiencia de los usuarios. |
| **10** | Responsable de logística | Registrar las cotizaciones de los proveedores y adjudicarlas | Analizar y seleccionar la mejor propuesta | \- Rediseñar el registro y adjudicación de cotizaciones. |
| **13** | Líder de Ingeniería | Elaborar las solicitudes de compras del proyecto | Instrumentar los pedidos de compras | \- Rediseñar la solicitud de compra según la experiencia de los usuarios. |
| **14** | Responsable de logística | Elaborar las Órdenes de Compra | Formalizar los pedidos a los proveedores | \- Formulario de Orden de compra con requisitos de compra. |

#### **Épica 4: Ejecución y Cierre de Proyectos**

| ID | Como (Rol) | Necesito (Funcionalidad) | Para (Propósito) | Criterios de Aceptación |
| :---- | :---- | :---- | :---- | :---- |
| **15** | Responsable de abastecimiento | Realizar acopios de los materiales comprados | Asegurar la recepción de los materiales | \- Procedimiento de acopio vinculado al proceso de abastecimiento. |
| **16** | Líder de Obra | Solicitar el despacho de materiales del depósito | Entregar los materiales y equipos en la obra | \- Procedimiento de despacho vinculado al proceso de abastecimiento. |
| **17** | Responsable de despacho | Realizar el remito de despacho de los materiales | Formalizar la entrega en la obra al cliente | \- Procedimiento de remito vinculado al proceso de abastecimiento. |
| **18** | Responsable de gestión de proyectos | Cerrar la ejecución de un proyecto | Completar la instancia final para su evaluación | \- Procedimiento de cierre contemplado en el proceso de Gestión de Proyectos. |

### **Módulo: Release 2 \- Administración y Finanzas**

*Este release incorpora funcionalidades contables, de facturación y gestión financiera para un control integral del negocio.*

#### **Épica 5: Configuración y Gestión Contable**

| ID | Como (Rol) | Necesito (Funcionalidad) | Para (Propósito) | Criterios de Aceptación |
| :---- | :---- | :---- | :---- | :---- |
| **R2.1** | Responsable de SSCC | Elaborar el Plan de Cuentas | Ser la base para la registración contable formal | \- ABM de Plan de cuentas (Rubros y Cuentas). |
| **R2.2** | Responsable de SSCC | Activar Centros de Costos | Realizar seguimiento de resultados por proyecto | \- Activar centro de costo durante la activación del proyecto. |
| **R2.3** | Auxiliar administrativo | Registrar facturas de proveedores y comprobantes de gastos | Contabilizar (generar asientos contables) compras y gastos | \- Módulo de registro de comprobantes de compra. |
| **R2.4** | Auxiliar administrativo | Emitir Facturas de venta | Contabilizar (generar asientos contables) ventas | \- Módulo de facturación integrado con el WS de AFIP. |
| **R2.5** | Responsable de SSCC | Registrar Libros (Diario, Mayor, IVA, IIBB, Ganancias, etc.) | Gestionar y presentar las DDJJ en los organismos correspondientes | \- Módulos para la generación de los distintos libros contables. |
| **R2.6** | Responsable de SSCC | Gestionar Órdenes de Pago y Caja | Controlar el circuito de pagos y movimientos de caja | \- Módulo de Órdenes de Pago y Libro de Caja. |
| **R2.7** | Responsable de SSCC | Generar informes de Resultados y Flujo de Fondos | Evaluar económica y financieramente proyectos, células y la empresa | \- Módulos de reporting financiero. |

### **Módulo: Gestión de Cartera de Clientes (CRM)**

*Este módulo se enfoca en las herramientas para que el equipo comercial gestione sus clientes y oportunidades.*

#### **Épica 6: Seguimiento Comercial y de Clientes**

| ID | Como (Rol) | Necesito (Funcionalidad) | Para (Propósito) | Criterios de Aceptación |
| :---- | :---- | :---- | :---- | :---- |
| **GC.1** | Vendedor | Registrar Clientes en mi cartera | Organizar mi agenda de contacto comercial | \- Funcionalidad para asignar y gestionar clientes por vendedor. |
| **GC.2** | Vendedor | Consultar acciones comerciales por cliente | Conocer antecedentes para planificar el contacto | \- Historial de interacciones y presupuestos por cliente. |
| **GC.3** | Vendedor | Generar un informe de estado de cartera de clientes | Hacer seguimiento de las acciones de venta | \- Reporte de estado y actividad de la cartera. |
| **GC.4** | Vendedor | Activar un \[Lead\] y un \[Presupuesto\] desde la gestión de cartera | Iniciar el ciclo de venta a partir de una oportunidad | \- Flujo para convertir una acción comercial en un lead y luego en un presupuesto. |
| **GC.5** | Vendedor | Generar un informe de comisiones | Analizar las comisiones liquidadas y a liquidar | \- Reporte de comisiones por ventas. |

### **Módulo: Gestión de Licitaciones**

*Este módulo permite la identificación, evaluación y seguimiento de oportunidades de negocio a través de licitaciones.*

#### **Épica 7: Captura y Evaluación de Licitaciones**

| ID | Como (Rol) | Necesito (Funcionalidad) | Para (Propósito) | Criterios de Aceptación |
| :---- | :---- | :---- | :---- | :---- |
| **L.1** | Líder de Célula | Registrar las licitaciones identificadas | Analizar y definir la evaluación de las mismas | \- Captar información básica de licitaciones (ej. desde https://www.google.com/search?q=mercadostransparentes.com) e importarla al sistema. |
| **L.2** | Líder de Célula | Evaluar los requisitos legales y técnicos | Determinar si aplicamos y si tenemos capacidad de ejecución | \- Checklists con atributos a evaluar a nivel legal y técnico. |
| **L.3** | Líder de Célula | Evaluar el presupuesto disponible | Determinar nuestra competitividad y definir la participación | \- Herramientas para el análisis de costos y precios. |
| **L.4** | Líder de Célula | Activar un presupuesto a partir de una licitación aprobada | Formalizar la presentación de la oferta | \- Vincular la licitación evaluada con el módulo de ABM de presupuestos. |

