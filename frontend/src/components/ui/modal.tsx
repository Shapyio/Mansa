export default function Modal({ children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-window"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>X</button>
        {children}
      </div>
    </div>
  );
}