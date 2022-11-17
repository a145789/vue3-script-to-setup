const getProcessArgv = () => {
    const args = process.argv.slice(2).filter(Boolean);
    console.log(args);
  };
  