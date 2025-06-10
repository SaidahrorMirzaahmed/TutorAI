import cls from "./Navbar.module.css";

export const Navbar = () => {
    return (
        <nav className={cls.navbar}>
                <div className={cls.navbarContent}>
                  <img src="src/assets/openai-logomark.svg" alt="Logo" className={cls.logo} />
                  <p>realtime console</p>
                </div>
              </nav>
    );
}