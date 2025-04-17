import React from 'react'

const Header = () => {
  return (
    <header className='border-b dark:border-zinc-700'>
        <div className=" p-[2rem] flex gap-[1rem]">
            <input placeholder='Procurar pasta com arquivos renomeados...' type="text" className='dark:bg-zinc-900 text-[1.6rem] dark:placeholder:text-zinc-300 flex-[1_1_70%] p-[1rem] rounded-[.8rem]' />
            <button className='dark:bg-zinc-100 text-[1.4rem] p-[1rem] rounded-[.8rem] font-medium'>
                Fazer upload
            </button>
        </div>
    </header>
  )
}

export default Header