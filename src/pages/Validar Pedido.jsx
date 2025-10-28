import React, { useState, useEffect ,useContext} from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { UserContext } from '../components/userContext';
import Axios from 'axios';
import Swal from 'sweetalert2';
import  '../styles/mystyles.css'
import Status from '../components/Estado';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { formatDate } from '../assets/js/functions';
import { Form, Dropdown } from 'react-bootstrap';
import { PaginationControl } from 'react-bootstrap-pagination-control';

const Validar = ({username}) => {
  const { user } = useContext(UserContext);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  const [userData, setUserData] = useState({});
  const [pedidosList, setPedidos] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  const [showEditModal, setShowEditModal] = useState(false);
  const [pedidoAEditar, setPedidoAEditar] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [total, setTotal] = useState(0.0);
  const [materiales, setMateriales] = useState([]);
  const [materialId, setMaterialId] = useState("");
  const [materialQuantity, setMaterialQuantity] = useState(1);
  const [searchMaterial, setSearchMaterial] = useState('');
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [currentPedido, setCurrentPedido] = useState(null);
  const [detalle, setDetalle] = useState([]);

  useEffect(() => {
    obtenerUser(user);
    getMateriales();
  }, [user]);

  useEffect(() => {
    if (userData && userData.length > 0) {
      const userData2 = userData[0];
      if (userData2 && userData2.id) {
        pedidosByLiquidador(userData2.id);
      }
    }
  }, [userData]);

  useEffect(() => {
    recalculateTotal();
  }, [selectedMaterials]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = pedidosList.slice(indexOfFirstItem, indexOfLastItem);

  const obtenerUser = async (user) => {
    try {
      const response = await Axios.get(`https://backend-modulo-pedidos.azurewebsites.net/auth/obtener/${user}`);
      setUserData(response.data);
    } catch (error) {
      console.error('Error al obtener usuario:', error);
    }
  };

  const pedidosByLiquidador = async (liquidador_id) => {
    try {
      const response = await Axios.get(`https://backend-modulo-pedidos.azurewebsites.net/obt-pedidos/pedidos/liquidador/${liquidador_id}`);
      setPedidos(response.data);
    } catch (error) {
      console.error('Error al obtener pedidos:', error);
    }
  };

  const getMateriales = () => {
    Axios.get("https://backend-modulo-pedidos.azurewebsites.net/otrasop/materiales").then((response) => {
      setMateriales(response.data);
    });
  };

    const fetchPedidoDetalle = async (pedidoId) => {
    try {
      const response = await Axios.get(`https://backend-modulo-pedidos.azurewebsites.net/obt-pedidos/pedidos_detalle/${pedidoId}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener detalle del pedido:', error);
      throw error;
    }
  };

  const editar_pedido = async (pedido) => {
    try {
      const detalle = await fetchPedidoDetalle(pedido.id);
      setSelectedMaterials([]);
      setPedidoAEditar(pedido);

      if (Array.isArray(detalle)) {
        detalle.forEach(item => {
          const nuevoMaterial = {
            id: item.material_id,
            matricula: item.matricula,
            descripcion: item.nombre_material,
            quantity: item.cantidad,
            precio: item.precio_material,
            importe: (item.precio_material * item.cantidad).toFixed(2),
          };
          setSelectedMaterials(prev => [...prev, nuevoMaterial]);
        });
      }

      setShowEditModal(true);
    } catch (error) {
      console.error('Error al editar pedido:', error);
    }
  };

  const update = () => {
    if (selectedMaterials.length < 1) {
      Swal.fire({
        icon: 'warning',
        title: 'No se puede actualizar',
        text: 'Debe haber al menos un material en la lista.',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const data = {
      id: pedidoAEditar.id,
      materiales: selectedMaterials,
      newtotal: total,
    };

    Axios.put("https://backend-modulo-pedidos.azurewebsites.net/operate-ped/update", data)
      .then(() => {
        pedidosByLiquidador(userData[0].id);
        setShowEditModal(false);
        limpiarCampos();
        Swal.fire({
          title: "<strong>Actualización exitosa!!!</strong>",
          html: "<i>El pedido fue actualizado con éxito!!</i>",
          icon: 'success',
          timer: 3000
        });
      })
      .catch(error => {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: JSON.parse(JSON.stringify(error)).message === "Network Error" ? "Intente más tarde" : JSON.parse(JSON.stringify(error)).message
        });
      });
  };

  const Validar_Ped = (val) => {
    const dataToUpdate = {
      id: val.id,
      validador_id: userData[0].id,
      estado: 4,
      send_validacion: 1,
    };

    Swal.fire({
      title: "Confirmar validación",
      html: "<i>¿Realmente desea validar el pedido con código: <strong>" + val.codigo + "</strong>?</i>",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, validar!!",
      cancelButtonText: "No, cancelar",
      allowOutsideClick: false,
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.put("https://backend-modulo-pedidos.azurewebsites.net/aprb_vld/validar", dataToUpdate)
          .then(() => {
            pedidosByLiquidador(userData[0].id);
            closeDetalleModal();
            Swal.fire({
              title: "pedido con código: " + val.codigo + " fue validado.",
              icon: "success",
              showConfirmButton: false,
              timer: 2000
            });
          })
          .catch(error => {
            Swal.fire({
              icon: 'error',
              title: 'Oops...',
              text: 'No se logró validar el pedido!',
              footer: JSON.parse(JSON.stringify(error)).message === "Network Error" ? "Intente más tarde" : JSON.parse(JSON.stringify(error)).message
            });
          });
      }
    });
  };

  const RechazadoValidador_Pedido = (val) => {
    const dataToUpdate = {
      id: val.id,
      validador_id: userData[0].id,
      estado: 5,
      send_validacion: 1,
    };

    Swal.fire({
      title: "Confirmar rechazo",
      html: "<i>¿Realmente desea rechazar el pedido con código: <strong>" + val.codigo + "</strong>?</i>",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, rechazar!!",
      cancelButtonText: "No, cancelar",
      allowOutsideClick: false,
    }).then((result) => {
      if (result.isConfirmed) {
        Axios.put("https://backend-modulo-pedidos.azurewebsites.net/aprb_vld/validar", dataToUpdate)
          .then(() => {
            pedidosByLiquidador(userData[0].id);
            Swal.fire({
              title: "pedido con código: " + val.codigo + " fue rechazado.",
              icon: "success",
              showConfirmButton: false,
              timer: 2000
            });
          })
          .catch(error => {
            Swal.fire({
              icon: 'error',
              title: 'Oops...',
              text: 'No se logró rechazar el pedido!',
              footer: JSON.parse(JSON.stringify(error)).message === "Network Error" ? "Intente más tarde" : JSON.parse(JSON.stringify(error)).message
            });
          });
      }
    });
  };

  const limpiarCampos = () => {
    setSearchMaterial("");
    setMaterialId("");
    setSelectedMaterials([]);
  };

  const handleQuantityChange = (index, newQuantity) => {
    const updatedMaterials = selectedMaterials.map((material, i) => {
      if (i === index) {
        const importe = (material.precio * newQuantity).toFixed(2);
        return { ...material, quantity: newQuantity, importe };
      }
      return material;
    });
    setSelectedMaterials(updatedMaterials);
  };

  const removeMaterial = (index) => {
    const updatedMaterials = [...selectedMaterials];
    updatedMaterials.splice(index, 1);
    setSelectedMaterials(updatedMaterials);
  };

  const recalculateTotal = () => {
    let newTotal = 0;
    selectedMaterials.forEach((material) => {
      newTotal += material.precio * material.quantity;
    });
    setTotal(newTotal.toFixed(2));
  };
  
    const closeMaterialModal = () => {
    setShowMaterialModal(false);
  };

  const openDetalleModal = (pedido) => {
    Axios.get(`https://backend-modulo-pedidos.azurewebsites.net/obt-pedidos/pedidos_detalle/${pedido.id}`)
      .then((response) => {
        setDetalle(response.data);
        setCurrentPedido(pedido);
        setShowDetalleModal(true);
      })
      .catch((error) => {
        console.error('Error al obtener detalle:', error);
      });
  };

  const closeDetalleModal = () => {
    setCurrentPedido(null);
    setShowDetalleModal(false);
  };

  return (
    <div className="container">
      <div className="card text-center">
        <div className="card-header">Validación de Pedidos</div>
        <div>{user && <h1>Bienvenido, {user}!</h1>}</div>
      </div>

      <Modal show={showEditModal && !showMaterialModal} onHide={() => { setShowEditModal(false); limpiarCampos(); }} backdrop="static" centered>
        <Modal.Header closeButton>
          <div style={{ flexGrow: 1 }}>
            <Modal.Title>Editar #{pedidoAEditar.codigo}</Modal.Title>
          </div>
          <div style={{ padding: '10px', border: '2px solid #007bff', borderRadius: '5px', backgroundColor: '#007bff', textAlign: 'left', color: 'white', display: 'inline-block', marginRight: '5vh' }}>
            <strong>Total:</strong> {Number(total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Modal.Header>
        <Modal.Body>
          <div className="input-group mb-3">
            <span className="input-group-text">Materiales:</span>
            <button className="btn btn-secondary mb" onClick={() => { setShowMaterialModal(true); setSearchMaterial(""); setMaterialQuantity(1); }}>
              Agregar Material
            </button>
            <ul className="list-group" style={{ maxHeight: '40vh', overflowY: 'auto' }}>
              {selectedMaterials.map((material, index) => (
                <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                  <div style={{ width: '17vw' }}>{material.matricula} - {material.descripcion}</div>
                  <input
                    type="number"
                    min="1"
                    value={material.quantity}
                    onChange={(event) => handleQuantityChange(index, parseFloat(event.target.value))}
                    className="form-control"
                    style={{ width: '4.5vw' }}
                    placeholder="Cantidad"
                  />
                  <button className="btn btn-danger btn-sm" onClick={() => removeMaterial(index)}>Eliminar</button>
                </li>
              ))}
            </ul>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={update}>Actualizar</Button>
        </Modal.Footer>
      </Modal>

      <div className="container mt-5">
        <div className="card text-center">
          <table className="table table-striped table-bordered">
            <thead>
              <tr>
                <th>#</th>
                <th onClick={() => handleSort('nombre_sector')}>Sector</th>
                <th onClick={() => handleSort('nombre_contratista')}>Contratista</th>
                <th onClick={() => handleSort('nombre_servicio')}>Servicio</th>
                <th onClick={() => handleSort('codigo')}>Código</th>
                <th onClick={() => handleSort('nombre_pdi')}>PDI</th>
                <th onClick={() => handleSort('LCL_ING')}>LCL</th>
                <th onClick={() => handleSort('usuario')}>Usuario</th>
                <th onClick={() => handleSort('fecha')}>Fecha</th>
                <th onClick={() => handleSort('total')}>Total</th>
                <th onClick={() => handleSort('estado')}>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((val, key) => (
                <tr key={val.id}>
                  <th scope="row">{key + 1}</th>
                  <td>{val.nombre_sector}</td>
                  <td>{val.nombre_contratista}</td>
                  <td>{val.nombre_servicio}</td>
                  <td>{val.codigo}</td>
                  <td>{val.nombre_pdi}</td>
                  <td>{val.LCL_ING}</td>
                  <td>{val.nombre_usuario}</td>
                  <td>{formatDate(val.fecha)}</td>
                  <td>{Number(val.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td><Status status={val.estado_id} /></td>
                  <td>
                    {val.send_validacion === 0 && (
                      <div className="btn-group" role="group">
                        <button type="button" onClick={() => Validar_Ped(val)} className="btn btn-success">Validar</button>
                        <button type="button" onClick={() => RechazadoValidador_Pedido(val)} className="btn btn-danger">Rechazar</button>
                        <button type="button" onClick={() => editar_pedido(val)} className="btn btn-warning">Edit</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="d-flex justify-content-between">
            <div>
              Mostrando registros de {indexOfFirstItem + 1} al {indexOfLastItem > pedidosList.length ? pedidosList.length : indexOfLastItem} de un total de {pedidosList.length} registros
            </div>
            <PaginationControl
              changePage={(page) => setCurrentPage(page)}
              ellipsis={1}
              page={currentPage}
              total={pedidosList.length}
              limit={itemsPerPage}
              last
            />
          </div>
        </div>
      </div>

      {showDetalleModal && (
        <Modal show={showDetalleModal} onHide={closeDetalleModal} dialogClassName="custom-modal" backdrop="static" centered>
          <Modal.Header closeButton>
            <div style={{ flexGrow: 1 }}>
              <Modal.Title>Detalle del Pedido #{currentPedido.codigo}</Modal.Title>
            </div>
            <div style={{ padding: '10px', border: '2px solid #007bff', borderRadius: '5px', backgroundColor: '#007bff', textAlign: 'left', color: 'white', display: 'inline-block', marginRight: '15vh' }}>
              <strong>Total:</strong> {Number(currentPedido.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </Modal.Header>
          <Modal.Body>
            {detalle.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Matrícula</th>
                      <th>Descripción</th>
                      <th>Cantidad</th>
                      <th>P/U</th>
                      <th>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.map((item) => (
                      <tr key={item.id}>
                        <td>{item.matricula}</td>
                        <td>{item.nombre_material}</td>
                        <td>{item.cantidad}</td>
                        <td>{Number(item.precio_material).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>{Number(item.importe).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No hay materiales solicitados para este pedido.</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" className="btn btn-success" onClick={() => Validar_Ped(currentPedido)}>Confirmar</Button>
            <Button type="button" className="btn btn-danger" onClick={closeDetalleModal}>Cancelar</Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}

export default Validar;
