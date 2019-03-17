//CONSTANTS
const w = window.innerWidth - 200;
const h = window.innerHeight - 250;
const margin = { top: 40, right: 20, bottom: 20, left: 40 };
const radius = 12;
const colourScale = [ 'red', 'blue', 'green', 'purple', 'orange' ];
const tooltip = d3.select('body').append('div').attr('class', 'tooltip').style('opacity', 0);

// MAIN SVG
let area = d3.select('#trajectoryDisplay').append('svg').attr('width', w).attr('height', h);

// SCALES AND AXIS
const xScale = d3.scale.linear().domain([ 0, 10 ]).range([ margin.left, w - margin.right ]);
const yScale = d3.scale.linear().domain([ 0, 10 ]).range([ margin.top, h - margin.bottom ]);
const xAxisOrient = d3.svg.axis().scale(xScale).orient('top');
const yAxisOrient = d3.svg.axis().scale(yScale).orient('left');
const xAxis = area
	.append('g')
	.attr({
		class: 'axis',
		transform: 'translate(' + [ 0, margin.top ] + ')'
	})
	.call(xAxisOrient);

const yAxis = area
	.append('g')
	.attr({
		class: 'axis',
		transform: 'translate(' + [ margin.left, 0 ] + ')'
	})
	.call(yAxisOrient);

function sortData() {
	const dataSorted = data.map((person) => ({ id: person.id, points: person.points.sort((a, b) => a.time - b.time) }));
	return dataSorted;
}

function sortDataById(ids) {
	const points = sortData().filter((person) => ids.includes(person.id));
	return points;
}

function calculateDistance(pointA, pointB) {
	return Math.sqrt(Math.pow(pointB.x - pointA.x, 2) + Math.pow(pointB.y - pointA.y, 2));
}

function computeData() {
	const dataSorted = sortData();
	let count = 0;
	return dataSorted.map((person) => {
		const points = person.points;
		const distance = points.reduce((acc, point, currentIndex, points) => {
			if (currentIndex + 1 < points.length - 1) {
				return acc + calculateDistance(points[currentIndex], points[currentIndex + 1]);
			}
			return acc;
		}, 0);

		const numberOfStops = points.reduce((acc, point, currentIndex, points) => {
			if (currentIndex + 1 < points.length - 1) {
				if (
					points[currentIndex].x === points[currentIndex + 1].x &&
					points[currentIndex].y === points[currentIndex + 1].y
				) {
					return acc + 1;
				}
			}
			return acc;
		}, 0);

		const timeElapsed = points[points.length - 1].time - points[0].time;
		const speed = distance / timeElapsed;
		const result = {
			color: count++,
			routeId: person.id,
			distance: distance,
			speed: speed,
			time: timeElapsed,
			stops: numberOfStops
		};
		return result;
	});
}

function drawTrajectoryIntel() {
	const routes = computeData();
	const columns = [ 'Color', 'Route Id', 'Distance', 'Speed', 'Total time', 'Number of stops' ];
	const table = d3.select('#trajectoryIntel');
	const tbody = table.select('tbody');

	const rows = tbody.selectAll(null).data(routes).enter().append('tr');
	rows
		.selectAll('td')
		.data((row) => {
			return columns.map((column, index) => {
				switch (column) {
					case 'Color':
						return { column: column, value: colourScale[row.color] };
					case 'Route Id':
						return { column: column, value: row.routeId };
					case 'Distance':
						return { column: column, value: row.distance };
					case 'Speed':
						return { column: column, value: row.speed };
					case 'Total time':
						return { column: column, value: row.time };
					case 'Number of stops':
						return { column: column, value: row.stops };
				}
			});
		})
		.enter()
		.append('td')
		.text(function(d) {
			return d.value;
		});
	return table;
}

function drawDashboard(ids) {
	let sortedData;
	if (ids) {
		sortedData = sortDataById(ids);
	} else {
		sortedData = sortData();
	}

	const lineFunction = d3.svg
		.line()
		.x(function(d) {
			return xScale(d.x);
		})
		.y(function(d) {
			return yScale(d.y);
		})
		.interpolate('linear');

	area.selectAll(null).data(sortedData).enter().append('g').each(function(person, i) {
		// Draw Cell
		d3
			.select(this)
			.selectAll(null)
			.data(person.points)
			.enter()
			.append('circle')
			.attr('cx', (point) => {
				return xScale(point.x);
			})
			.attr('cy', (point) => {
				return yScale(point.y);
			})
			.attr('r', radius)
			.attr('fill', () => {
				return colourScale[i];
			})
			.on('mouseover', function(point) {
				tooltip.transition().duration(300).style('opacity', 0.8);
				tooltip
					.html('<p/>Time:' + point.time)
					.style('left', d3.event.pageX + 'px')
					.style('top', d3.event.pageY + 10 + 'px');
			})
			.on('mouseout', function() {
				tooltip.transition().duration(100).style('opacity', 0);
			})
			.on('mousemove', function() {
				tooltip.style('left', d3.event.pageX + 'px').style('top', d3.event.pageY + 10 + 'px');
			});

		// Draw Line
		d3
			.select(this)
			.selectAll(null)
			.data(person.points)
			.enter()
			.append('path')
			.attr('id', 'trajectorypath')
			.attr('d', lineFunction(person.points))
			.attr('stroke', colourScale[i])
			.attr('stroke-width', 2)
			.attr('fill', 'none');

		// Draw Text inside Cell
		d3
			.select(this)
			.selectAll(null)
			.data(person.points)
			.enter()
			.append('text')
			.attr('id', 'trajectorystep')
			.attr('x', (points) => {
				return xScale(points.x);
			})
			.attr('y', (points) => {
				return yScale(points.y);
			})
			.attr('text-anchor', 'middle')
			.attr('fill', 'white')
			.text(function(points, y) {
				return y;
			});
	});
}

function drawFilters() {
	const sortedData = sortData();
	d3
		.select('#trajectoryOptions')
		.append('div')
		.attr({ class: 'form-check form-check-inline' })
		.append('label')
		.attr({
			class: 'form-check-label',
			for: 'drawall'
		})
		.text('Display all routes ')
		.append('input')
		.attr({
			name: 'drawoptions',
			type: 'checkbox',
			class: 'form-check-input',
			id: 'drawall',
			value: 'drawall'
		});

	area.selectAll(null).data(sortedData).enter().append('g').each(function(person, i) {
		d3
			.select('#trajectoryOptions')
			.append('div')
			.attr({ class: 'form-check form-check-inline' })
			.append('label')
			.attr({
				class: 'form-check-label',
				for: person.id
			})
			.text('Display ' + person.id + ' route ')
			.append('input')
			.attr({
				name: 'drawoptions',
				type: 'checkbox',
				class: 'form-check-input',
				id: person.id,
				value: person.id
			});
	});

	d3.selectAll('input[name=drawoptions]').on('change', function() {
		function getCheckedBoxes(chkboxName) {
			const checkboxes = document.getElementsByName(chkboxName);
			let checkboxesChecked = [];
			console.log(checkboxes);
			[ ...checkboxes ].map((checkbox) => {
				if (checkbox.checked) checkboxesChecked.push(checkbox.defaultValue);
			});
			return checkboxesChecked.length > 0 ? checkboxesChecked : null;
		}
		const checkedBoxes = getCheckedBoxes('drawoptions');
		updateDashboard(checkedBoxes);
	});
}
function clearDashboard() {
	d3.selectAll('g').selectAll('circle').remove();
	d3.selectAll('g').selectAll('#trajectorypath').remove();
	d3.selectAll('g').selectAll('#trajectorystep').remove();
}
function updateDashboard(checkedBoxes) {
	clearDashboard();
	if (checkedBoxes) {
		if (checkedBoxes.includes('drawall')) drawDashboard();
		else {
			drawDashboard(checkedBoxes);
		}
	}
}

function init() {
	drawDashboard();
	drawFilters();
	drawTrajectoryIntel();
}

init();
