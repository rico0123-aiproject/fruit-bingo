(function(root, factory){
  const api = factory();
  if(typeof module !== "undefined" && module.exports){
    module.exports = api;
  }
  root.GameCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
  function completedLines(marks, size){
    const lines = [];

    for(let r = 0; r < size; r++){
      let ok = true;
      for(let c = 0; c < size; c++){
        if(!marks[r * size + c]) ok = false;
      }
      if(ok) lines.push([{r, c:0}, {r, c:size - 1}]);
    }

    for(let c = 0; c < size; c++){
      let ok = true;
      for(let r = 0; r < size; r++){
        if(!marks[r * size + c]) ok = false;
      }
      if(ok) lines.push([{r:0, c}, {r:size - 1, c}]);
    }

    let diag1 = true;
    let diag2 = true;
    for(let i = 0; i < size; i++){
      if(!marks[i * size + i]) diag1 = false;
      if(!marks[i * size + (size - 1 - i)]) diag2 = false;
    }
    if(diag1) lines.push([{r:0, c:0}, {r:size - 1, c:size - 1}]);
    if(diag2) lines.push([{r:0, c:size - 1}, {r:size - 1, c:0}]);

    return lines;
  }

  function countLines(marks, size){
    return completedLines(marks, size).length;
  }

  function maxPossibleLines(size){
    return size * 2 + 2;
  }

  function clampTarget(size, value){
    return Math.min(maxPossibleLines(size), Math.max(1, value || 3));
  }

  function winner(target, firstToTarget, lineCounts){
    const p1Hits = lineCounts[1] >= target;
    const p2Hits = lineCounts[2] >= target;

    if(!p1Hits && !p2Hits) return 0;
    if(p1Hits && !p2Hits) return 1;
    if(!p1Hits && p2Hits) return 2;

    if(firstToTarget[1] !== null && firstToTarget[2] !== null){
      if(firstToTarget[1] < firstToTarget[2]) return 1;
      if(firstToTarget[2] < firstToTarget[1]) return 2;
    }

    if(lineCounts[1] > lineCounts[2]) return 1;
    if(lineCounts[2] > lineCounts[1]) return 2;
    return 0;
  }

  function availableFruitKeys(boards){
    const keys = new Set();
    Object.values(boards).forEach(board => {
      board.forEach(fruit => {
        if(fruit) keys.add(fruit.k);
      });
    });
    return keys;
  }

  return { completedLines, countLines, maxPossibleLines, clampTarget, winner, availableFruitKeys };
});
