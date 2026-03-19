import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Search, Download, Loader2, LogOut } from 'lucide-react';

// eslint-disable-next-line react/prop-types
export default function Dashboard({ onLogout }) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const placeholders = [
    "Ex: Oficinas em Fernandópolis, SP",
    "Ex: Restaurantes em São Paulo, SP",
    "Ex: Advogados no Rio de Janeiro, RJ",
    "Ex: Padarias em Belo Horizonte, MG",
    "Ex: Clínicas veterinárias em Curitiba, PR"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  const executeSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) {
      setStatusMessage('Por favor, insira um termo de busca.');
      return;
    }

    setIsLoading(true);
    setResults([]);
    setStatusMessage('Buscando e processando dados... Isso pode levar alguns minutos.');

    try {
      // Usando API do RapidAPI (Local Business Data)
      const apiKey = import.meta.env.VITE_RAPIDAPI_KEY;
      const url = `https://local-business-data.p.rapidapi.com/search?query=${encodeURIComponent(query)}&limit=30`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'local-business-data.p.rapidapi.com'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro na rede: ${response.statusText} (código: ${response.status})`);
      }

      const rawData = await response.json();
      
      // Ajusta formato (RapidAPI costuma retornar envuelto em 'data', n8n retornava um array direto)
      const dataArray = rawData.data || rawData;

      if (Array.isArray(dataArray)) {
        const dataToDisplay = dataArray.map(item => ({
          Nome: item.name || item.name,
          // Compatibilidade com a estrutura do N8N ou RapidAPI
          Telefone: item.phone_number || (item.emails_and_contacts?.phone_numbers?.[0]) || null,
          Categorias: Array.isArray(item.subtypes) ? item.subtypes.join(', ') : (item.type || ''),
          Endereço: item.full_address || item.address || '',
          Website: item.website || '',
          Cidade: item.city || '',
          Estado: item.state || '',
          CEP: item.zipcode || '',
          Rating: item.rating || '',
          'Quantidade de Avaliações': item.review_count || ''
        }));
        
        setResults(dataToDisplay);
        
        if (dataToDisplay.length === 0) {
          setStatusMessage('A busca foi concluída, mas nenhum dado foi retornado.');
        } else {
          setStatusMessage(`Busca concluída! ${dataToDisplay.length} resultados encontrados.`);
        }
      } else {
        console.error("A resposta da API não contém um array esperado:", rawData);
        setStatusMessage('Formato de resposta inválido retornado pela API.');
      }

    } catch (error) {
      console.error('Erro ao chamar a API:', error);
      setStatusMessage('Ocorreu um erro ao buscar os dados. Verifique a chave da API e os limites.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = () => {
    if (results.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(results);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Empresas');

    worksheet['!cols'] = [
      { wch: 35 }, { wch: 20 }, { wch: 40 }, { wch: 45 }, { wch: 25 },
      { wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 25 }
    ];

    XLSX.writeFile(workbook, 'busca_leads.xlsx');
  };

  return (
    <div className="container">
      <div className="logout-wrapper">
        <button onClick={onLogout} className="logout-button">
          <LogOut size={18} /> Sair
        </button>
      </div>
      
      <header>
        <h1>Encontre seu próximo cliente</h1>
        <p>Digite um segmento e cidade para encontrar novos leads instantaneamente.</p>
      </header>

      <form className="search-wrapper" onSubmit={executeSearch}>
        <div className="search-box">
          <Search className="search-icon" size={20} />
          <input 
            type="text" 
            id="search-query" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholders[placeholderIndex]} 
            disabled={isLoading}
          />
        </div>
        <button type="submit" id="search-button" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="spinner" size={20} />
          ) : (
            <span id="search-button-text">Buscar</span>
          )}
        </button>
      </form>
      
      <p id="search-status">{statusMessage}</p>

      {results.length > 0 && (
        <div id="results-section">
          <div className="results-header">
            <button id="export-button" onClick={exportToExcel}>
              <Download size={18} />
              <span>Exportar para Excel</span>
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Categorias</th>
                  <th>Endereço</th>
                  <th>Website</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.Nome || '-'}</td>
                    <td>{item.Telefone || '-'}</td>
                    <td>{item.Categorias || '-'}</td>
                    <td>{item.Endereço || '-'}</td>
                    <td>
                      {item.Website ? (
                        <a 
                          href={item.Website.startsWith('http') ? item.Website : `http://${item.Website}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          {item.Website}
                        </a>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
