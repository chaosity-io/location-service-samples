import StoreFinder from '@/components/StoreFinder'

export default function Home() {
  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Chaosity</h1>
          <span className="text-sm text-gray-400">|</span>
          <span className="text-sm font-medium text-gray-600">Store Finder</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          <a href="#" className="hover:text-gray-900">Shop</a>
          <a href="#" className="hover:text-gray-900">Collections</a>
          <a href="#" className="font-medium text-gray-900">Stores</a>
          <a href="#" className="hover:text-gray-900">About</a>
        </nav>
      </header>

      <StoreFinder />
    </div>
  )
}
