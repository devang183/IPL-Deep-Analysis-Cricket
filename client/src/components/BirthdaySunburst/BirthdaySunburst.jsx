import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import axios from 'axios';
import { X, Calendar } from 'lucide-react';

function BirthdaySunburst() {
  const [birthdayData, setBirthdayData] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [playerList, setPlayerList] = useState([]);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // Fetch birthday data from API
  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/players/birthdays');

        // Transform data into hierarchical structure
        const hierarchyData = transformBirthdayData(response.data.players);
        setBirthdayData(hierarchyData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching birthday data:', err);
        setError('Failed to load birthday data');
        setLoading(false);
      }
    };

    fetchBirthdays();
  }, []);

  // Transform flat birthday data into hierarchical structure
  const transformBirthdayData = (players) => {
    const root = {
      name: 'IPL Players',
      children: []
    };

    // Month ranges: [01-03], [04-06], [07-09], [10-12]
    const monthRanges = [
      { name: 'Jan-Mar', range: [1, 2, 3], children: [] },
      { name: 'Apr-Jun', range: [4, 5, 6], children: [] },
      { name: 'Jul-Sep', range: [7, 8, 9], children: [] },
      { name: 'Oct-Dec', range: [10, 11, 12], children: [] }
    ];

    // Parse dates and group by month range -> day -> year -> players
    players.forEach(player => {
      // Skip if date_of_birth is missing, empty, or not a string
      if (!player.date_of_birth || typeof player.date_of_birth !== 'string' || player.date_of_birth.trim() === '') {
        return;
      }

      // Parse date_of_birth (assuming formats like "DD/MM/YYYY" or "YYYY-MM-DD")
      let day, month, year;

      if (player.date_of_birth.includes('/')) {
        const parts = player.date_of_birth.split('/');
        if (parts.length === 3) {
          day = parseInt(parts[0]);
          month = parseInt(parts[1]);
          year = parseInt(parts[2]);
        }
      } else if (player.date_of_birth.includes('-')) {
        const parts = player.date_of_birth.split('-');
        if (parts.length === 3) {
          year = parseInt(parts[0]);
          month = parseInt(parts[1]);
          day = parseInt(parts[2]);
        }
      }

      // Validate parsed values
      if (!day || !month || !year || isNaN(day) || isNaN(month) || isNaN(year)) return;
      if (month < 1 || month > 12 || day < 1 || day > 31) return;

      // Find the month range
      const monthRange = monthRanges.find(mr => mr.range.includes(month));
      if (!monthRange) return;

      // Format as MMDD (e.g., "0310" for March 10)
      const monthDay = `${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;

      // Find or create day group
      let dayGroup = monthRange.children.find(d => d.name === monthDay);
      if (!dayGroup) {
        dayGroup = {
          name: monthDay,
          displayName: `${getMonthName(month)} ${day}`,
          children: []
        };
        monthRange.children.push(dayGroup);
      }

      // Find or create year group
      let yearGroup = dayGroup.children.find(y => y.name === year.toString());
      if (!yearGroup) {
        yearGroup = {
          name: year.toString(),
          children: []
        };
        dayGroup.children.push(yearGroup);
      }

      // Add player to year group
      yearGroup.children.push({
        name: player.name,
        value: 1 // Each player has value 1
      });
    });

    // Sort and clean up empty groups
    monthRanges.forEach(mr => {
      mr.children.sort((a, b) => a.name.localeCompare(b.name));
      mr.children.forEach(day => {
        day.children.sort((a, b) => parseInt(b.name) - parseInt(a.name)); // Sort years descending
      });
    });

    root.children = monthRanges.filter(mr => mr.children.length > 0);
    return root;
  };

  const getMonthName = (month) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  // Draw sunburst chart
  useEffect(() => {
    if (!birthdayData || !svgRef.current) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 800;
    const height = 800;
    const radius = Math.min(width, height) / 2;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Create hierarchy
    const hierarchy = d3.hierarchy(birthdayData)
      .sum(d => d.value || 0)
      .sort((a, b) => b.value - a.value);

    // Create partition layout
    const partition = d3.partition()
      .size([2 * Math.PI, radius]);

    partition(hierarchy);

    // Color scales for each layer
    const monthRangeColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']; // Blue, Green, Orange, Red

    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1);

    // Draw arcs
    const paths = svg.selectAll('path')
      .data(hierarchy.descendants().filter(d => d.depth > 0))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', d => {
        if (d.depth === 1) {
          // Month range layer - use distinct colors
          const index = d.parent.children.indexOf(d);
          return monthRangeColors[index % monthRangeColors.length];
        } else if (d.depth === 2) {
          // Day layer - lighter shade of parent
          const parentColor = d3.select(paths.nodes()[hierarchy.descendants().indexOf(d.parent) - 1]).attr('fill');
          return d3.color(parentColor).brighter(0.5);
        } else if (d.depth === 3) {
          // Year layer - even lighter
          const parentColor = d3.select(paths.nodes()[hierarchy.descendants().indexOf(d.parent.parent) - 1]).attr('fill');
          return d3.color(parentColor).brighter(1);
        } else {
          // Player layer - lightest
          const parentColor = d3.select(paths.nodes()[hierarchy.descendants().indexOf(d.parent.parent.parent) - 1]).attr('fill');
          return d3.color(parentColor).brighter(1.5);
        }
      })
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .style('opacity', 0.9)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .style('opacity', 1)
          .attr('stroke-width', 2);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .style('opacity', 0.9)
          .attr('stroke-width', 1);
      })
      .on('click', function(event, d) {
        handleSegmentClick(d);
      });

    // Add center label
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '24px')
      .style('font-weight', 'bold')
      .style('fill', 'white')
      .text('Birthdays');

  }, [birthdayData]);

  const handleSegmentClick = (node) => {
    console.log('Clicked:', node);

    // Level 2: Day level (MMDD) - expand to show years
    if (node.depth === 2) {
      setSelectedSegment({
        type: 'day',
        data: node,
        monthDay: node.data.name,
        displayName: node.data.displayName
      });
      return;
    }

    // Level 3: Year level - show players with this birthday
    if (node.depth === 3) {
      const players = node.children ? node.children.map(c => c.data.name) : [];
      const monthDay = node.parent.data.name;
      const year = node.data.name;

      setPlayerList({
        monthDay,
        year,
        displayName: node.parent.data.displayName,
        players
      });
      setShowPlayerModal(true);
      return;
    }

    // Level 4: Individual player - show in modal
    if (node.depth === 4) {
      const monthDay = node.parent.parent.data.name;
      const year = node.parent.data.name;

      setPlayerList({
        monthDay,
        year,
        displayName: node.parent.parent.data.displayName,
        players: [node.data.name]
      });
      setShowPlayerModal(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading birthday data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-400">
          <p className="text-xl">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" ref={containerRef}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg flex items-center gap-2">
          <Calendar className="w-8 h-8" />
          Birthday Sunburst
        </h1>
        <p className="text-slate-300 drop-shadow-md">
          Explore IPL player birthdays in an interactive sunburst chart
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-slate-800/40 backdrop-blur-md border border-slate-600/50 rounded-lg p-4 mb-6 max-w-3xl">
        <h3 className="text-white font-semibold mb-2">How to use:</h3>
        <ul className="text-slate-300 text-sm space-y-1">
          <li>• <span className="text-purple-400">Inner ring:</span> Month ranges (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec)</li>
          <li>• <span className="text-blue-400">Second ring:</span> Days within each month range</li>
          <li>• <span className="text-green-400">Third ring:</span> Birth years</li>
          <li>• <span className="text-orange-400">Outer ring:</span> Individual players</li>
          <li>• Click on any segment to explore deeper levels</li>
        </ul>
      </div>

      {/* Sunburst Chart */}
      <div className="flex justify-center">
        <svg ref={svgRef} className="drop-shadow-2xl"></svg>
      </div>

      {/* Player List Modal */}
      {showPlayerModal && playerList && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  Players Born on {playerList.displayName}, {playerList.year}
                </h2>
                <p className="text-slate-400">
                  {playerList.players.length} player{playerList.players.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setShowPlayerModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Player List */}
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {playerList.players.map((player, index) => (
                  <div
                    key={index}
                    className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 hover:border-purple-500/50 transition-colors"
                  >
                    <p className="text-white font-medium">{player}</p>
                    <p className="text-slate-400 text-sm mt-1">
                      {playerList.displayName}, {playerList.year}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BirthdaySunburst;
